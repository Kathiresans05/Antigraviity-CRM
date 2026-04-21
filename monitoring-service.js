const fs = require('fs');
const path = require('path');
const os = require('os');
const { ipcMain, app, desktopCapturer, systemPreferences } = require('electron');

// Ensure log directory is writable in production
const logDir = app ? app.getPath('userData') : __dirname;
const logPath = path.join(logDir, 'tracker-debug.log');

function logToFile(msg) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}\n`;
  try {
    fs.appendFileSync(logPath, formatted);
  } catch (e) {
      console.error('Failed to write to log file:', e.message);
  }
  console.log(msg);
}

// Initial log
logToFile('--- MONITORING SERVICE INITIALIZED ---');
logToFile(`[Monitoring] Log directory: ${logDir}`);

let uiohook;
try {
  const lib = require('uiohook-napi');
  // Handle both named (uIOhook) and default exports
  uiohook = lib.uIOhook || lib.uiohook || lib;
  logToFile(`[Monitoring] uiohook-napi object discovered: ${typeof uiohook}`);
  if (uiohook) {
    logToFile(`[Monitoring] Methods found: ${Object.keys(uiohook).filter(k => typeof uiohook[k] === 'function').join(', ')}`);
  }
} catch (err) {
  logToFile(`[Monitoring] CRITICAL: Failed to require uiohook-napi: ${err.message}`);
}

const { io } = require('socket.io-client');


let monitoringSocket = null;
let liveStreamTimer = null;
const LIVE_INTERVAL = 1000; // 1 second for "live" thumbnails (CCTV mode)

// Check if uiohook is loaded
try {
  logToFile(`[Monitoring] uiohook object is ${uiohook ? 'FOUND' : 'MISSING'}`);
} catch (err) {
  logToFile(`[Monitoring] Diagnostic error: ${err.message}`);
}

process.on('uncaughtException', (err) => {
  logToFile(`[Monitoring] CRASH: Uncaught Exception: ${err.message}`);
});

// We now use Electron's native desktopCapturer instead of screenshot-desktop

let activeWin;
try {
    activeWin = require('active-win');
} catch (e) {
    logToFile('[Monitoring] active-win module not found.');
}

let isMonitoring = false;
let isStreaming = false; // Add dedicated flag for the screenshot stream
let trackingUserId = null;
let trackingUserName = null;
let hookStatus = 'stopped'; // stopped, starting, running, error
let lastErrorMessage = '';
let currentStats = {
  keyboardCount: 0,
  mouseCount: 0,
  idleSeconds: 0,
  activeSeconds: 0,
  startTime: null,
  activeApp: 'Unknown',
  windowTitle: 'Unknown'
};

let consecutiveIdleSeconds = 0;
let lastActivityTime = Date.now();
let trackTimer = null;
let syncTimer = null;
let screenshotTimer = null;

let BACKEND_URL = process.env.NEXTAUTH_URL 
    ? `${process.env.NEXTAUTH_URL}/api/monitoring`
    : "http://localhost:3000/api/monitoring";


const SYNC_INTERVAL = 60000; // 60 seconds
const SCREENSHOT_INTERVAL = 300000; // 5 minutes (300,000 ms)

async function getActiveWindow() {
  if (!activeWin) return;
  try {
    const win = await activeWin();
    if (win) {
      currentStats.activeApp = win.owner.name || win.owner.path || 'Unknown';
      currentStats.windowTitle = win.title || 'Unknown';
    }
  } catch (err) {
    // Silently fail to avoid console Spam
  }
}

async function takeScreenshotAndSync(userId, employeeName) {
  try {
    logToFile('[Monitoring] Capturing high-res native screenshot...');
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    if (!sources || sources.length === 0) throw new Error("No screens found");

    const imgBuffer = sources[0].thumbnail.toJPEG(80);
    const base64Img = imgBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64Img}`;

    const res = await fetch(`${BACKEND_URL}/screenshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId || "SYSTEM_AGENT",
        employeeName: employeeName || "System Agent",
        imageUrl: dataUri,
        activeApp: currentStats.activeApp,
        windowTitle: currentStats.windowTitle
      })
    });
    if (res.ok) logToFile('[Monitoring] Screenshot synced successfully.');
  } catch (err) {
    logToFile(`[Monitoring] Screenshot ERROR: ${err.message}`);
  }
}

async function syncToBackend(userId, employeeName) {
  if (!isMonitoring) return;
  try {
    logToFile('[Monitoring] Syncing activity to backend...');
    const stats = { ...currentStats };
    
    const res = await fetch(`${BACKEND_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId || "SYSTEM_AGENT",
        employeeName: employeeName || "System Agent",
        ...stats
      })
    });

    if (res.ok) {
      logToFile('[Monitoring] Activity synced successfully.');
      // Reset periodic counters
      currentStats.keyboardCount = 0;
      currentStats.mouseCount = 0;
      currentStats.idleSeconds = 0;
      currentStats.activeSeconds = 0;
    }
  } catch (err) {
    logToFile(`[Monitoring] Sync ERROR: ${err.message}`);
  }
}

function startMonitoring(userId, name, backendUrl) {
  if (backendUrl) {
    BACKEND_URL = `${backendUrl}/api/monitoring`;
    logToFile(`[Monitoring] Updated BACKEND_URL: ${BACKEND_URL}`);
  }
  if (isMonitoring) {
      logToFile(`[Monitoring] Active session detected for another user. Restarting with ${name}...`);
      stopMonitoring();
  }

  trackingUserId = userId;
  trackingUserName = name;

  // 1. Initial State
  isStreaming = true;
  isMonitoring = true;
  hookStatus = 'running';
  currentStats.startTime = new Date();
  lastActivityTime = Date.now();
  consecutiveIdleSeconds = 0;

  // 2. Start Live Streaming (Socket)
  setupLiveStreaming(userId, name, backendUrl);
  logToFile(`[Monitoring] LIVE streaming started for ${name} (${userId}).`);

  // 3. Background Timers
  trackTimer = setInterval(() => {
    if (!isMonitoring) return;
    const now = Date.now();
    getActiveWindow();

    if (now - lastActivityTime < 10000) {
      currentStats.activeSeconds++;
      consecutiveIdleSeconds = 0;
    } else {
      currentStats.idleSeconds++;
      consecutiveIdleSeconds++;
      if (consecutiveIdleSeconds === 300) {
        logToFile('[Monitoring] ALERT: 5 minutes of continuous inactivity detected.');
        process.emit('monitoring:idle-warning');
      }
    }
  }, 1000);

  syncTimer = setInterval(() => syncToBackend(userId, name), SYNC_INTERVAL);
  screenshotTimer = setInterval(() => takeScreenshotAndSync(userId, name), SCREENSHOT_INTERVAL);

  // 4. Activity Hooks (Optional but preferred)
  if (!uiohook || typeof uiohook.on !== 'function') {
    lastErrorMessage = 'uiohook object is invalid - keyboard/mouse tracking disabled, streaming only';
    logToFile(`[Monitoring] WARNING: ${lastErrorMessage}`);
    return;
  }
  
  try {
    logToFile('[Monitoring] Registering uiohook listeners...');
    uiohook.on('keydown', () => {
      if (!isMonitoring) return;
      currentStats.keyboardCount++;
      lastActivityTime = Date.now();
      consecutiveIdleSeconds = 0; 
    });

    uiohook.on('mousedown', () => {
      if (!isMonitoring) return;
      currentStats.mouseCount++;
      lastActivityTime = Date.now();
      consecutiveIdleSeconds = 0;
    });

    uiohook.on('mousemove', () => {
      if (!isMonitoring) return;
      lastActivityTime = Date.now();
      consecutiveIdleSeconds = 0;
    });

    hookStatus = 'starting';
    uiohook.start();
    logToFile('[Monitoring] SUCCESS: uiohook started.');
  } catch (err) {
    hookStatus = 'error';
    lastErrorMessage = err.message;
    logToFile(`[Monitoring] ERROR STARTING UIOHOOK: ${err.message}`);
  }
}

function stopMonitoring() {
  if (!isMonitoring && !isStreaming) return;
  
  logToFile('[Monitoring] Stopping service and cleaning up all timers...');
  
  isMonitoring = false;
  isStreaming = false;
  trackingUserId = null;
  trackingUserName = null;
  hookStatus = 'stopped';

  try { 
      if (uiohook && typeof uiohook.stop === 'function') {
          uiohook.stop(); 
          logToFile('[Monitoring] uiohook stopped.');
      }
  } catch(e) {
      logToFile(`[Monitoring] Error stopping uiohook: ${e.message}`);
  }

  // Clear ALL intervals to prevent leaks
  if (trackTimer) { clearInterval(trackTimer); trackTimer = null; }
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
  if (screenshotTimer) { clearInterval(screenshotTimer); screenshotTimer = null; }
  if (liveStreamTimer) { clearInterval(liveStreamTimer); liveStreamTimer = null; }
  
  if (monitoringSocket) {
      logToFile('[Monitoring] Disconnecting live stream socket...');
      monitoringSocket.disconnect();
      monitoringSocket = null;
  }
  
  logToFile('[Monitoring] Service Stopped successfully.');
}

async function setupLiveStreaming(userId, name, backendUrl) {
    if (monitoringSocket) return;

    const baseSocketUrl = backendUrl || "http://localhost:3001";
    const socketNamespaceUrl = baseSocketUrl.endsWith('/') ? `${baseSocketUrl}monitoring` : `${baseSocketUrl}/monitoring`;
    
    logToFile(`[Monitoring] Connecting to Signaling Server for ${name} at ${socketNamespaceUrl}...`);
    monitoringSocket = io(socketNamespaceUrl, {

        path: '/socket.io',

        reconnection: true,
        reconnectionAttempts: 5
    });

    monitoringSocket.on('connect', () => {
        const deviceId = os.hostname() || "DEV-UNKNOWN";
        logToFile(`[Monitoring] Live stream socket CONNECTED for ${name} (${userId}) on ${deviceId}`);
        monitoringSocket.emit('register-agent', {
            userId,
            employeeName: name,
            deviceId: deviceId
        });
    });

    monitoringSocket.on('disconnect', () => {
        logToFile('[Monitoring] Live stream socket DISCONNECTED.');
    });

    // Start frame capture loop
    liveStreamTimer = setInterval(async () => {
        if (!isStreaming) return;
        try {
            // Check Mac OS Screen Recording permission gracefully
            if (process.platform === 'darwin' && systemPreferences.getMediaAccessStatus('screen') !== 'granted') {
                throw new Error("macOS Screen Recording permission denied.");
            }

            const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
            if (!sources || sources.length === 0) throw new Error("No screens found");

            const imgBuffer = sources[0].thumbnail.toJPEG(60); // Optimize quality for fast streaming
            const frame = imgBuffer.toString('base64');
            monitoringSocket.emit('screen-frame', {
                userId,
                frame,
                activeApp: currentStats.activeApp
            });
            
            // If we recover from an error, tell the server
            if (lastErrorMessage && lastErrorMessage.includes('capture')) {
                lastErrorMessage = null;
                monitoringSocket.emit('agent-status-change', { userId, status: 'online' });
            }
        } catch (err) {
            const isPermissionError = err.message.toLowerCase().includes('permission') || 
                                    err.message.toLowerCase().includes('access') ||
                                    err.message.toLowerCase().includes('denied');
            
            lastErrorMessage = `Screen capture error: ${err.message}`;
            logToFile(`[Monitoring] Live Frame Capture Error: ${err.message}`);

            if (isPermissionError) {
                monitoringSocket.emit('agent-status-change', { 
                    userId, 
                    status: 'permission_denied',
                    error: "Screen Recording permission is required."
                });
            }
        }
    }, LIVE_INTERVAL);
}

// IPC Handlers for Next.js communication
ipcMain.handle('monitoring:start', (event, payload) => {
  const userId = payload?.userId || "SYSTEM_AGENT";
  const name = payload?.name || "Employee";
  const backendUrl = payload?.backendUrl;
  logToFile(`[Monitoring] IPC monitoring:start received. User: ${name} (${userId}), Backend: ${backendUrl}`);
  try {
    startMonitoring(userId, name, backendUrl);
    return { success: true, status: hookStatus };
  } catch (err) {
    logToFile(`[Monitoring] CRITICAL ERROR in IPC start handler: ${err.message}`);
    return { success: false, error: err.message };
  }
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
