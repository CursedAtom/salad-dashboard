const { contextBridge, ipcRenderer } = require('electron');

console.log("Preload script loaded");

contextBridge.exposeInMainWorld('electron', {
    requestData: () => ipcRenderer.send('request-data'),
    receiveData: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
});
