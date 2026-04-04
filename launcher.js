/**
 * CRM STANDALONE LAUNCHER
 * This script bypasses OS-level environment conflicts to force-open the Desktop window.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('[Launcher] Starting Antigraviity CRM in Standalone Mode...');

// 1. Locate the Electron Binary
const electronPath = path.join(__dirname, 'node_modules/electron/dist/electron.exe');

if (!fs.existsSync(electronPath)) {
    console.error('[Launcher] Error: Electron binary not found! Please run npm install.');
    process.exit(1);
}

// 2. Launch with a CLEAN environment to bypass shadowing
const cleanEnv = Object.assign({}, process.env);
// Clear environment variables that can cause Electron to misbehave as regular Node
delete cleanEnv.NODE_ENV;
delete cleanEnv.NODE_PATH;
delete cleanEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], {
    cwd: __dirname,
    env: cleanEnv,
    stdio: 'inherit',
    detached: false
});

child.on('close', (code) => {
    console.log(`[Launcher] Electron process closed with code ${code}`);
    process.exit(code);
});

child.on('error', (err) => {
    console.error('[Launcher] Failed to start Electron:', err);
});

console.log('[Launcher] Standalone Window requested. Please wait...');
