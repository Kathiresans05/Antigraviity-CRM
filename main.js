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

// Global Exception Handling to prevent silent crashes
process.on('uncaughtException', (err) => {
    console.error('[Main] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});


const { app, BrowserWindow, ipcMain } = electron;

// Initialize Monitoring Service (Isolated logic)
try {
    const { startMonitoring, stopMonitoring } = require('./monitoring-service');
} catch (err) {
    console.warn('[Main] Monitoring service could not be initialized:', err.message);
}

let mainWindow;
let bannerWindow;

function createBannerWindow() {
    bannerWindow = new BrowserWindow({
        width: 340,
        height: 60,
        x: 40,
        y: 40,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js') // Added for IPC access
        }
    });

    const bannerHtml = `
        <body style="margin:0; padding:0; background: transparent; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="-webkit-app-region: drag; display:flex; align-items:center; gap:12px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); padding: 10px 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2); cursor: move;">
                <div style="position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <div style="width: 10px; height: 10px; background: #22c55e; border-radius: 50%;"></div>
                    <div style="position: absolute; width: 18px; height: 18px; background: #22c55e; border-radius: 50%; opacity: 0.4; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                </div>
                <div style="display: flex; flex-direction: column; flex-grow: 1;">
                    <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: rgba(255,255,255,1); text-transform: uppercase;">Device Monitored</span>
                    <span style="font-size: 9px; font-weight: 500; color: rgba(255,255,255,0.5);">Work & Security Purposes Only</span>
                </div>
                <button 
                    onclick="window.electronAPI.banner.hide()"
                    style="-webkit-app-region: no-drag; background: rgba(255,255,255,0.1); border: none; color: white; width: 20px; height: 20px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; hover: background: rgba(255,255,255,0.2); transition: background 0.2s;"
                >
                    &times;
                </button>
            </div>
            <style>
                @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
                button:hover { background: rgba(255,255,255,0.2) !important; }
            </style>
        </body>
    `;
    bannerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(bannerHtml)}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Antigraviity CRM",
    icon: path.join(__dirname, 'public/logo_highres.png')
  });

  const isLiveMode = process.env.CRM_LIVE_MODE === 'true';
  const liveUrl = 'https://antigraviity-crm-cxmf.onrender.com/login';

  if (app.isPackaged || isLiveMode) {
    console.log('[Main] Loading LIVE Production Environment...');
    mainWindow.loadURL(liveUrl).catch(err => {
      console.error('[Main] Failed to load production URL:', err);
    });
  } else {
    console.log('[Main] Loading Local Development Environment...');
    mainWindow.loadURL('http://localhost:3000/login').catch(err => {
        console.error('[Main] Failed to load dev URL:', err);
    });
  }



  if (!app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: [path.resolve(process.argv[1])]
    });
  }

  // Bind the navigation listener
  setupNavigationListener(mainWindow);
}

// Setup navigation listener to auto-stop monitoring on logout/login page
function setupNavigationListener(window) {
    window.webContents.on('did-navigate', (event, url) => {
        if (url.includes('/login')) {
            console.log('[Main] Navigation to login detected. Stopping monitoring sessions...');
            try {
                const { stopMonitoring } = require('./monitoring-service');
                stopMonitoring();
            } catch (err) {
                console.error('[Main] Auto-stop failed:', err.message);
            }
        }
    });
}

// Global listener for monitoring events
process.on('monitoring:idle-warning', () => {
    if (mainWindow) {
        mainWindow.webContents.send('monitoring:idle-warning');
    }
});

// Banner Control
ipcMain.on('banner:hide', () => {
    if (bannerWindow) {
        bannerWindow.hide();
    }
});

app.whenReady().then(async () => {
  createWindow();
  createBannerWindow();

  // Consent Logic: Show on first launch (Slight Delay to ensure Window Handle is ready)
  setTimeout(() => {
    const fs = require('fs');
    const consentPath = path.join(app.getPath('userData'), 'consent.json');
    if (!fs.existsSync(consentPath)) {
        try {
            const { dialog } = electron;
            const choice = dialog.showMessageBoxSync(mainWindow || null, {
                type: 'info',
                buttons: ['I Decline', 'I Consent'],
                title: 'Employee Monitoring Consent',
                message: 'Monitoring Agreement',
                detail: 'To continue using this corporate device, you must consent to activity monitoring, including screenshot capture and application tracking, for productivity and security purposes as per company policy.',
                defaultId: 1,
                cancelId: 0
            });

            if (choice === 1) {
                fs.writeFileSync(consentPath, JSON.stringify({ accepted: true, date: new Date() }));
            } else {
                app.quit();
            }
        } catch (err) {
            console.error('[Main] Consent dialog error:', err);
        }
    }
  }, 1000);


  // Automatically handle media permissions for the voice rooms
  const { session } = electron;
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL();
    console.log(`[Main] Permission request: ${permission} for ${url}`);
    
    // Always allow microphone access for the app's own origin
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

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
