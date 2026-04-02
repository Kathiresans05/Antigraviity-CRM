const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

const replacements = [
    { from: /@\/components\//g, to: '@/frontend/components/' },
    { from: /@\/lib\//g, to: '@/backend/lib/' },
    { from: /@\/models\//g, to: '@/backend/models/' },
    { from: /@\/types\//g, to: '@/backend/types/' }
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
                content = content.replace(r.from, r.to);
            });
            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated: ${path.relative(srcDir, filePath)}`);
            }
        }
    });
}

console.log('Starting Global Import Migration...');
walk(srcDir);
console.log('Migration Complete!');
