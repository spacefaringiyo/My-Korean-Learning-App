import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, '../src/data/raw_modules');
const OUTPUT_DIR = path.join(__dirname, '../extracted_phrases');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Write CSV header for the combined file, with UTF-8 BOM so Excel opens it correctly
const ALL_OUTPUT_FILE = path.join(OUTPUT_DIR, 'all_modules.csv');
let allCsvContent = '\uFEFF'; 
allCsvContent += 'Module ID,Phrase ID,Korean,Japanese (Intent)\n';

const files = fs.readdirSync(RAW_DIR).filter(file => file.endsWith('.yaml'));

let totalCount = 0;

for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    try {
        const moduleData = yaml.load(fileContent);

        if (!moduleData.id || !moduleData.phrases) {
            continue;
        }

        const moduleId = moduleData.id;
        
        // Start CSV content for this specific module
        let moduleCsvContent = '\uFEFF';
        moduleCsvContent += 'Phrase ID,Korean,Japanese (Intent)\n';
        
        let modulePhraseCount = 0;

        moduleData.phrases.forEach(phrase => {
            const phraseId = phrase.id || '';
            // Escape double quotes for CSV format by replacing " with ""
            const korean = (phrase.korean || '').replace(/"/g, '""'); 
            const jpIntent = phrase.translations?.ja?.intent 
                ? phrase.translations.ja.intent.replace(/"/g, '""') 
                : '';
            
            // Add row to combined CSV
            allCsvContent += `"${moduleId}","${phraseId}","${korean}","${jpIntent}"\n`;
            
            // Add row to module-specific CSV (no Module ID)
            moduleCsvContent += `"${phraseId}","${korean}","${jpIntent}"\n`;
            
            totalCount++;
            modulePhraseCount++;
        });
        
        // Write the module-specific CSV
        const moduleOutputFile = path.join(OUTPUT_DIR, `${moduleId}.csv`);
        if (modulePhraseCount > 0) {
            fs.writeFileSync(moduleOutputFile, moduleCsvContent, 'utf8');
        }
        
    } catch (e) {
        console.error(`Error processing YAML file ${file}:`, e);
    }
}

// Write the combined CSV
fs.writeFileSync(ALL_OUTPUT_FILE, allCsvContent, 'utf8');

console.log(`Extraction complete! Extracted ${totalCount} phrases across ${files.length} modules.`);
console.log(`Saved to: ${OUTPUT_DIR}/`);
