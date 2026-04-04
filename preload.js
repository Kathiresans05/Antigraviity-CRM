const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  monitoring: {
    start: () => ipcRenderer.invoke('monitoring:start'),
    stop: () => ipcRenderer.invoke('monitoring:stop'),
    flush: () => ipcRenderer.invoke('monitoring:flush'),
    getStats: () => ipcRenderer.invoke('monitoring:get-stats'),
    status: () => ipcRenderer.invoke('monitoring:status'),
  },
});
