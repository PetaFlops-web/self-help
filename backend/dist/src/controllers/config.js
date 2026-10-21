import { getActiveScoringConfig } from '../services/scoring-config.js';
import { ok } from '../middlewares/response.js';
export function getScoringConfig(_req, res) {
    const scoringConfig = getActiveScoringConfig();
    ok(res, 'scoring', scoringConfig);
}
