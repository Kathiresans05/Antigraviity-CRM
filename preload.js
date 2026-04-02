const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any needed IPC bridges here for future use
  // For example:
  // sendMessage: (message) => ipcRenderer.send('message-from-renderer', message),
});
