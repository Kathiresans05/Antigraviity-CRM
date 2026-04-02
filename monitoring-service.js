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

let idleTimer = null;
const IDLE_THRESHOLD = 300; // 5 minutes in seconds

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    currentStats.idleSeconds += IDLE_THRESHOLD;
  }, IDLE_THRESHOLD * 1000);
}

function startMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;
  currentStats.startTime = new Date();
  
  uiohook.on('keydown', () => {
    if (!isMonitoring) return;
    currentStats.keyboardCount++;
    currentStats.activeSeconds++;
    resetIdleTimer();
  });

  uiohook.on('mousedown', () => {
    if (!isMonitoring) return;
    currentStats.mouseCount++;
    currentStats.activeSeconds++;
    resetIdleTimer();
  });

  uiohook.on('mousemove', () => {
    if (!isMonitoring) return;
    // We count mouse movement as activity but don't increment a "count" 
    // to avoid massive number inflation. Just resets the idle timer.
    currentStats.activeSeconds++;
    resetIdleTimer();
  });

  uiohook.start();
  console.log('[Monitoring] Service Started.');
}

function stopMonitoring() {
  if (!isMonitoring) return;
  isMonitoring = false;
  uiohook.stop();
  if (idleTimer) clearTimeout(idleTimer);
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

ipcMain.handle('monitoring:get-stats', () => {
  const stats = { ...currentStats };
  // Reset interval stats after manual pull if needed, 
  // or just return the snapshot.
  return stats;
});

module.exports = {
  startMonitoring,
  stopMonitoring
};
