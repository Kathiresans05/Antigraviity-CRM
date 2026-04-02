const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

const replacements = [
    // Alias updates
    { from: /@\/components\//g, to: '@/frontend/components/' },
    { from: /@\/lib\//g, to: '@/backend/lib/' },
    { from: /@\/models\//g, to: '@/backend/models/' },
    { from: /@\/types\//g, to: '@/backend/types/' },
    
    // Relative path updates (the missing link)
    // Matches imports like from "../../../../lib/auth-config"
    { from: /from\s+['"](?:\.\.\/)+(lib|models|types|components|context|assets)\/(.*)['"]/g, 
      to: (match, folder, rest) => {
        const pillar = ['components', 'context', 'assets'].includes(folder) ? 'frontend' : 'backend';
        return `from "@/${pillar}/${folder}/${rest}"`;
      }
    }
];

function walk(dir) {
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
                if (typeof r.to === 'function') {
                    content = content.replace(r.from, r.to);
                } else {
                    content = content.replace(r.from, r.to);
                }
            });
            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated: ${path.relative(srcDir, filePath)}`);
            }
        }
    });
}

console.log('Starting Final Global Import Sweep...');
walk(srcDir);
console.log('Sweep Complete!');
