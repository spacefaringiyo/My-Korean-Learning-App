import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../src/data/database.json');
const OUTPUT_DIR = path.join(__dirname, '../src/data/raw_modules');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'basics.yaml');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const rawData = fs.readFileSync(DB_PATH, 'utf-8');
const data = JSON.parse(rawData);

const moduleData = {
    id: 'basics',
    title: 'Basic Phrases',
    theme: 'General',
    difficulty: 'Beginner',
    phrases: data.phrases
};

const yamlStr = yaml.dump(moduleData, { indent: 2, lineWidth: -1 });

fs.writeFileSync(OUTPUT_FILE, yamlStr, 'utf-8');

console.log('Successfully migrated database.json to basics.yaml');
