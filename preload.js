const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  monitoring: {
    start: () => ipcRenderer.invoke('monitoring:start'),
    stop: () => ipcRenderer.invoke('monitoring:stop'),
    getStats: () => ipcRenderer.invoke('monitoring:get-stats'),
  },
});
