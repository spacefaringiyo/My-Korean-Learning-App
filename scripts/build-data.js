import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, '../src/data/raw_modules');

// When called with --dist, write directly to dist/data/ (for production builds).
// Otherwise, write to public/data/ (for dev server).
const useDistDir = process.argv.includes('--dist');
const OUTPUT_DIR = path.join(__dirname, useDistDir ? '../dist/data' : '../public/data');
const MODULES_OUTPUT_DIR = path.join(OUTPUT_DIR, 'modules');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(MODULES_OUTPUT_DIR)) {
    fs.mkdirSync(MODULES_OUTPUT_DIR, { recursive: true });
}

const manifest = [];
const searchIndex = {}; // dictionary word -> Set of { module_id, phrase_id }

const files = fs.readdirSync(RAW_DIR).filter(file => file.endsWith('.yaml'));

for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    try {
        const moduleData = yaml.load(fileContent);

        if (!moduleData.id) {
            console.warn(`Module in ${file} is missing an 'id'. Skipping.`);
            continue;
        }

        // 1. Add to manifest
        manifest.push({
            id: moduleData.id,
            title: moduleData.title || moduleData.id,
            theme: moduleData.theme || 'Uncategorized',
            difficulty: moduleData.difficulty || 'Unknown',
            phraseCount: moduleData.phrases ? moduleData.phrases.length : 0
        });

        // 2. Build Search Index
        if (moduleData.phrases) {
            moduleData.phrases.forEach(phrase => {
                if (phrase.blocks) {
                    phrase.blocks.forEach(block => {
                        if (block.dictionary) {
                            if (!searchIndex[block.dictionary]) {
                                searchIndex[block.dictionary] = [];
                            }
                            // Store unique locations
                            const exists = searchIndex[block.dictionary].some(
                                loc => loc.module_id === moduleData.id && loc.phrase_id === phrase.id
                            );
                            if (!exists) {
                                searchIndex[block.dictionary].push({
                                    module_id: moduleData.id,
                                    phrase_id: phrase.id
                                });
                            }
                        }
                    });
                }
            });
        }

        // 3. Write individual JSON module to public/data/modules/
        const moduleOutputPath = path.join(MODULES_OUTPUT_DIR, `${moduleData.id}.json`);
        fs.writeFileSync(moduleOutputPath, JSON.stringify(moduleData), 'utf8');
        console.log(`Compiled module: ${moduleData.id}`);

    } catch (e) {
        console.error(`Error processing YAML file ${file}:`, e);
    }
}

// Write manifest
fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest), 'utf8');
console.log('Generated manifest.json');

// Write search index
fs.writeFileSync(path.join(OUTPUT_DIR, 'search_index.json'), JSON.stringify(searchIndex), 'utf8');
console.log('Generated search_index.json');

console.log('Data build complete!');
