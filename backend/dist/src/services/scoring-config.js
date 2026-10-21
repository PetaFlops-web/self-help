import { loadScoringConfig } from '../config/scoring.js';
export function getActiveScoringConfig() {
    return loadScoringConfig();
}
