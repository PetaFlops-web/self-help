import { loadScoringConfig } from '../config/scoring.js';
import type { ScoringConfig } from '../types/scoring.js';

export function getActiveScoringConfig(): ScoringConfig {
  return loadScoringConfig();
}
