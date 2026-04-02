const electron = require('electron');
console.log('Electron require result:', typeof electron);
console.log('Electron keys:', Object.keys(electron));
if (typeof electron === 'string') {
    console.log('Electron is a path string:', electron);
}
console.log('App module:', electron.app);
console.log('Process versions:', process.versions);
