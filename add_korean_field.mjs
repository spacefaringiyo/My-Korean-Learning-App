import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'src/data/raw_modules');
const files = ['basics.yaml', 'claudes_picks.yaml', 'inner_monologue.yaml'];

for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(content);

    const koreanMap = {};
    for (const p of data.phrases) {
        let ko = "";
        for (const b of p.blocks) {
            ko += b.surface;
            if (b.space_after) {
                ko += " ";
            }
        }
        koreanMap[p.id] = ko.trim();
    }

    const lines = content.split('\n');
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        newLines.push(line);

        const match = line.match(/^(\s+)-\s*id:\s*([a-zA-Z0-9_]+)\s*$/);
        if (match) {
            const indent = match[1];
            const id = match[2];
            if (koreanMap[id]) {
                newLines.push(`${indent}  korean: "${koreanMap[id]}"`);
            }
        }
    }

    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`Updated ${file}`);
}
