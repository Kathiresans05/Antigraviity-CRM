const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const scanDirs = [
    path.join(rootDir, 'src'),
    path.join(rootDir, 'frontend'),
    path.join(rootDir, 'backend')
];

const replacements = [
    // Ensure all imports use the pillar aliases
    { from: /@\/frontend\//g, to: '@/frontend/' },
    { from: /@\/backend\//g, to: '@/backend/' },
    
    // Convert any remaining relative ../ frontend/backend imports to aliased ones
    { from: /from\s+['"](?:\.\.\/)+(frontend|backend)\/(.*)['"]/g, 
      to: (match, folder, rest) => {
        return `from "@/${folder}/${rest}"`;
      }
    }
];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            walk(filePath);
        } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;
            replacements.forEach(r => {
                content = content.replace(r.from, r.to);
            });
            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated: ${path.relative(rootDir, filePath)}`);
            }
        }
    });
}

console.log('Starting Root-Level Global Import Sweep...');
scanDirs.forEach(dir => {
    console.log(`Scanning: ${path.relative(rootDir, dir)}`);
    walk(dir);
});
console.log('Sweep Complete!');
