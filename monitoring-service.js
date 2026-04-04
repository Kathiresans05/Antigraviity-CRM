const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'tracker-debug.log');

function logToFile(msg) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}\n`;
  try {
    fs.appendFileSync(logPath, formatted);
  } catch (e) {}
  console.log(msg);
}

// Initial log
logToFile('--- MONITORING SERVICE INITIALIZED ---');

let uiohook;
try {
  const lib = require('uiohook-napi');
  uiohook = lib.uiohook || lib;
  logToFile(`[Monitoring] uiohook-napi library loaded successfully.`);
} catch (err) {
  logToFile(`[Monitoring] CRITICAL: Failed to load uiohook-napi: ${err.message}`);
}

const { ipcMain } = require('electron');

// Check if uiohook is loaded
try {
  logToFile(`[Monitoring] uiohook object is ${uiohook ? 'FOUND' : 'MISSING'}`);
  if (uiohook) {
    logToFile(`[Monitoring] uiohook properties: ${Object.keys(uiohook).join(', ')}`);
  }
} catch (err) {
  logToFile(`[Monitoring] Diagnostic error: ${err.message}`);
}

process.on('uncaughtException', (err) => {
  logToFile(`[Monitoring] CRASH: Uncaught Exception: ${err.message}`);
});

let isMonitoring = false;
let hookStatus = 'stopped'; // stopped, starting, running, error
let lastErrorMessage = '';
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
  logToFile(`[Monitoring] Entered startMonitoring(). isMonitoring=${isMonitoring}`);
  if (isMonitoring) return;
  
  currentStats.startTime = new Date();
  lastActivityTime = Date.now();
  
  uiohook.on('keydown', () => {
    if (!isMonitoring) return;
    currentStats.keyboardCount++;
    lastActivityTime = Date.now();
    console.log('[Monitoring] Key Press detected.');
  });

  uiohook.on('mousedown', () => {
    if (!isMonitoring) return;
    currentStats.mouseCount++;
    lastActivityTime = Date.now();
    console.log('[Monitoring] Mouse Click detected.');
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

  hookStatus = 'starting';
  logToFile('[Monitoring] Attempting to start uiohook...');

  try {
    uiohook.start();
    isMonitoring = true;
    hookStatus = 'running';
    logToFile('[Monitoring] Service Started Successfully.');
  } catch (err) {
    hookStatus = 'error';
    lastErrorMessage = err.message;
    logToFile(`[Monitoring] ERROR STARTING UIOHOOK: ${err.message}`);
    if (err.message.includes('permission')) {
      logToFile('[Monitoring] HINT: Please run the app as Administrator.');
    }
  }
}

function stopMonitoring() {
  if (!isMonitoring) return;
  isMonitoring = false;
  hookStatus = 'stopped';
  uiohook.stop();
  if (trackTimer) clearInterval(trackTimer);
  logToFile('[Monitoring] Service Stopped.');
}

// IPC Handlers for Next.js communication
ipcMain.handle('monitoring:start', () => {
  logToFile('[Monitoring] IPC monitoring:start received.');
  startMonitoring();
  return { success: true, status: hookStatus };
});

ipcMain.handle('monitoring:stop', () => {
  logToFile('[Monitoring] IPC monitoring:stop received.');
  stopMonitoring();
  return { success: true };
});

ipcMain.handle('monitoring:status', () => {
  return { status: hookStatus, error: lastErrorMessage };
});

ipcMain.handle('monitoring:ping', () => {
  return { success: true, timestamp: Date.now() };
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
