import { readFileSync } from 'node:fs';
import path from 'node:path';
let cached = null;
export function loadForbiddenPhrases() {
    if (cached)
        return cached;
    const filePath = path.resolve(process.cwd(), 'config', 'forbidden_phrases.json');
    const raw = readFileSync(filePath, 'utf8');
    const config = JSON.parse(raw);
    if (!Array.isArray(config.phrases) || config.phrases.length === 0) {
        throw new Error('forbidden_phrases.json: phrases[] kosong atau bukan array');
    }
    cached = config;
    return config;
}
