import fs from 'fs';
import path from 'path';

const version = new Date().getTime().toString();
const content = JSON.stringify({ version });
const publicDir = path.resolve('public');
const filePath = path.join(publicDir, 'version.json');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

fs.writeFileSync(filePath, content);
console.log(`[Version] generated: ${version}`);
