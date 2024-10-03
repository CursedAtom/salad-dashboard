const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let saladData = [];

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1300,
        height: 1100,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools();

    const logDir = 'C:\\ProgramData\\Salad\\logs';

    function parseLogFile(content, filePath) {
        const earningsReportRegex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} -\d{2}:\d{2}) \[INF\] Predicted Earnings Report: ([\d.]+) from \(([^)]+)\)/g;
        const workloadRunningRegex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} -\d{2}:\d{2}) \[INF\] Workload ([^)]+) is already running; Last Install: InstallSuccess @ ([\d.]+) secs/g;
        const walletBalanceRegex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} -\d{2}:\d{2}) \[INF\] Wallet: Current\(([\d.]+)\), Predicted\(([\d.]+)\)/g;
        const runningArgsRegex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} -\d{2}:\d{2}) \[INF\] Running with args: -machine_id ([\w-]+) -server_host_port sgs-([^-]+)-gateway/g;
        const timedStatsRegex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} -\d{2}:\d{2}) \[INF\] {"level":"info","ts":[\d.]+,"caller":"logger\/timed-logger.go:\d+","msg":"timed stats","BidirThroughput":([\d.]+),/g;

        let match;
        while ((match = earningsReportRegex.exec(content)) !== null) {
            saladData.push({
                timestamp: match[1],
                earnings: parseFloat(match[2]),
                containerId: match[3]
            });
        }

        while ((match = workloadRunningRegex.exec(content)) !== null) {
            const container = saladData.find(c => c.containerId === match[2]);
            if (container) {
                const runtimeSeconds = parseFloat(match[3]);
                const runtimeHours = Math.floor(runtimeSeconds / 3600);
                const runtimeMinutes = Math.floor((runtimeSeconds % 3600) / 60);
                const runtimeSecs = Math.floor(runtimeSeconds % 60);
                container.runtime = `${runtimeHours}h ${runtimeMinutes}m ${runtimeSecs}s`;
            }
        }

        while ((match = walletBalanceRegex.exec(content)) !== null) {
            saladData.push({
                timestamp: match[1],
                currentBalance: parseFloat(match[2]),
                predictedBalance: parseFloat(match[3])
            });
        }

        while ((match = runningArgsRegex.exec(content)) !== null) {
            saladData.push({
                timestamp: match[1],
                machineId: match[2],
                gateway: match[3]
            });
        }

        while ((match = timedStatsRegex.exec(content)) !== null) {
            saladData.push({
                timestamp: match[1],
                BidirThroughput: parseFloat(match[2]) * (1 / 8 / 30)  // Convert from bits per 30s to MBps
            });
        }
    }

    function readLogDir(directory) {
        fs.readdir(directory, (err, files) => {
            if (err) throw err;
            files.forEach(file => {
                const filePath = path.join(directory, file);
                if (fs.lstatSync(filePath).isFile() && (path.extname(filePath) === '.txt' || path.extname(filePath) === '.log')) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    parseLogFile(content, filePath);
                } else if (fs.lstatSync(filePath).isDirectory() && file.startsWith('Bandwidth-SGS-')) {
                    readLogDir(filePath);
                }
            });
        });
    }

    readLogDir(logDir);

    if (saladData.length > 100) {
        saladData = saladData.slice(saladData.length - 100);
    }

    console.log("Sending data to renderer:", saladData);

    ipcMain.on('request-data', (event) => {
        console.log("Data requested from renderer");
        event.reply('salad-data', saladData);
    });
}

app.on('ready', () => {
    console.log('App is ready');
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
