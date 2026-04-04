/**
 * MONITORING SERVICE (UIOHOOK)
 * This module runs in the Electron Main Process.
 * It strictly captures EVENT COUNTS, not content.
 */

const { uiohook } = require('uiohook-napi');
const { ipcMain } = require('electron');

let isMonitoring = false;
let currentStats = {
  keyboardCount: 0,
  mouseCount: 0,
  idleSeconds: 0,
  activeSeconds: 0,
  startTime: null
};

let lastActivityTime = Date.now();
let trackTimer = null;

function startMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;
  currentStats.startTime = new Date();
  lastActivityTime = Date.now();
  
  uiohook.on('keydown', () => {
    if (!isMonitoring) return;
    currentStats.keyboardCount++;
    lastActivityTime = Date.now();
  });

  uiohook.on('mousedown', () => {
    if (!isMonitoring) return;
    currentStats.mouseCount++;
    lastActivityTime = Date.now();
  });

  uiohook.on('mousemove', () => {
    if (!isMonitoring) return;
    lastActivityTime = Date.now();
  });

  // Background timer to track active vs idle seconds every second
  trackTimer = setInterval(() => {
    if (!isMonitoring) return;
    
    // If last activity was less than 10 seconds ago, consider this second "active"
    const now = Date.now();
    if (now - lastActivityTime < 10000) {
      currentStats.activeSeconds++;
    } else {
      currentStats.idleSeconds++;
    }
  }, 1000);

  uiohook.start();
  console.log('[Monitoring] Service Started.');
}

function stopMonitoring() {
  if (!isMonitoring) return;
  isMonitoring = false;
  uiohook.stop();
  if (trackTimer) clearInterval(trackTimer);
  console.log('[Monitoring] Service Stopped.');
}

// IPC Handlers for Next.js communication
ipcMain.handle('monitoring:start', () => {
  startMonitoring();
  return { success: true };
});

ipcMain.handle('monitoring:stop', () => {
  stopMonitoring();
  return { success: true };
});

ipcMain.handle('monitoring:flush', () => {
  const stats = { ...currentStats };
  // Reset counters for the NEXT block
  currentStats.keyboardCount = 0;
  currentStats.mouseCount = 0;
  currentStats.activeSeconds = 0;
  currentStats.idleSeconds = 0;
  return stats;
});

ipcMain.handle('monitoring:get-stats', () => {
  return { ...currentStats };
});

module.exports = {
  startMonitoring,
  stopMonitoring
};
