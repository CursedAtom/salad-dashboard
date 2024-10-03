console.log("Renderer script loaded");

function createPlot(id, title, xData, yData, tooltipData, type='bar') {
    console.log(`Creating plot: ${title}`, { xData, yData, tooltipData });
    var data = [{
        x: xData,
        y: yData.map(Number),
        type: type,
        marker: { color: '#4287f5' },
        text: tooltipData,
        hoverinfo: 'text'
    }];

    var layout = {
        paper_bgcolor: '#2F2F2F',
        plot_bgcolor: '#2F2F2F',
        font: { color: 'white' },
        title: title
    };

    Plotly.newPlot(id, data, layout);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Requesting data from main process");
    window.electron.requestData();

    window.electron.receiveData('salad-data', (saladData) => {
        console.log('Data received:', saladData);
        
        // Wallet Balance Plot
        let walletData = saladData.filter(data => data.currentBalance !== undefined);
        let xValuesWallet = walletData.map((_, i) => i + 1);
        let currentBalances = walletData.map(data => data.currentBalance);
        let tooltipDataWallet = walletData.map(data => `Timestamp: ${data.timestamp}<br>Current Balance: ${data.currentBalance}<br>Predicted Balance: ${data.predictedBalance}`);
        createPlot('plot1', 'Wallet Balance', xValuesWallet, currentBalances, tooltipDataWallet);

        // Container Stats Plot
        let containerStatsData = saladData.filter(data => data.earnings !== undefined);
        let xValuesContainer = containerStatsData.map((_, i) => i + 1);
        let containerStats = containerStatsData.map(data => data.earnings);
        let tooltipDataContainer = containerStatsData.map(data => `Timestamp: ${data.timestamp}<br>Container ID: ${data.containerId}<br>Earnings: ${data.earnings}<br>Runtime: ${data.runtime ? data.runtime : 'N/A'}`);
        createPlot('plot2', 'Containers', xValuesContainer, containerStats, tooltipDataContainer);

        // Bandwidth Sharing Plot
        let bandwidthData = saladData.filter(data => data.BidirThroughput !== undefined);
        let xValuesBandwidth = bandwidthData.map((_, i) => i + 1);
        let bidirThroughput = bandwidthData.map(data => data.BidirThroughput);
        let tooltipDataBandwidth = bandwidthData.map(data => `Timestamp: ${data.timestamp}<br>Throughput: ${data.BidirThroughput} MBps`);
        createPlot('plot3', 'Bandwidth Sharing', xValuesBandwidth, bidirThroughput, tooltipDataBandwidth, 'scatter');

        // Earning History Plot
        let earningsHistory = walletData.map((data, index) => {
            if (index === 0) return 0;
            return walletData[index].currentBalance - walletData[index - 1].currentBalance;
        });
        let tooltipDataEarnings = walletData.map((data, index) => {
            let delta = index === 0 ? 0 : (walletData[index].currentBalance - walletData[index - 1].currentBalance).toFixed(2);
            return `Delta: ${delta}<br>Timestamp: ${data.timestamp}<br>Balance: ${data.currentBalance}`;
        });
        createPlot('plot4', 'Balance Changes', xValuesWallet, earningsHistory, tooltipDataEarnings, 'scatter');
    });
});
