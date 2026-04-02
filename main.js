/**
 * NUCLEAR ELECTRON LOADER
 * This script is specifically designed to bypass Windows environment shadowing.
 */

const path = require('path');

// 1. ATTEMPT INTERNAL BINDING (NUCLEAR FALLBACK)
let electron;
try {
    // Standard approach
    electron = require('electron');
    if (typeof electron === 'string') {
        console.log('[Main] Shadowed electron path detected. Clearing cache...');
        delete require.cache[require.resolve('electron')];
        electron = require('electron');
    }
} catch (err) {}

// 2. ATTEMPT NODE:ELECTRON (MODERN PREFIX)
if (!electron || typeof electron === 'string') {
    try {
        electron = require('node:electron');
    } catch (err) {}
}

if (!electron || !electron.app) {
    console.error('[Main] CRITICAL: Electron API is still unreachable. Environment conflict.');
    process.exit(1);
}

const { app, BrowserWindow, ipcMain } = electron;

// Initialize Monitoring Service (Isolated logic)
try {
    const { startMonitoring, stopMonitoring } = require('./monitoring-service');
} catch (err) {
    console.warn('[Main] Monitoring service could not be initialized:', err.message);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Antigraviity CRM",
    // Standard layout: public is up one level from desktop/
    icon: path.join(__dirname, 'public/logo_highres.png')
  });

  // Load from the Next.js dev server
  win.loadURL('http://localhost:3000/login');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
