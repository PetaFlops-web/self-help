import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  validateConfig,
} from '../services/scoring.js';
import type { ScoringConfig } from '../types/scoring.js';

let cached: ScoringConfig | null = null;

export function loadScoringConfig(): ScoringConfig {
  if (cached) return cached;

  const filePath = path.resolve(process.cwd(), 'config', 'scoring.json');
  const raw = readFileSync(filePath, 'utf8');
  const config = JSON.parse(raw) as ScoringConfig;
  validateConfig(config);

  cached = config;
  return config;
}

export function loadScoringConfigFrom(filePath: string): ScoringConfig {
  const raw = readFileSync(filePath, 'utf8');
  const config = JSON.parse(raw) as ScoringConfig;
  validateConfig(config);
  return config;
}
