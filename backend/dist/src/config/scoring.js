import { readFileSync } from 'node:fs';
import path from 'node:path';
import { validateConfig, } from '../services/scoring.js';
let cached = null;
export function loadScoringConfig() {
    if (cached)
        return cached;
    const filePath = path.resolve(process.cwd(), 'config', 'scoring.json');
    const raw = readFileSync(filePath, 'utf8');
    const config = JSON.parse(raw);
    validateConfig(config);
    cached = config;
    return config;
}
export function loadScoringConfigFrom(filePath) {
    const raw = readFileSync(filePath, 'utf8');
    const config = JSON.parse(raw);
    validateConfig(config);
    return config;
}
