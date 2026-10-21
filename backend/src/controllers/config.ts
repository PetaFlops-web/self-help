import type { Request, Response } from 'express';
import { getActiveScoringConfig } from '../services/scoring-config.js';
import { ok } from '../middlewares/response.js';

export function getScoringConfig(_req: Request, res: Response): void {
  const scoringConfig = getActiveScoringConfig();
  ok(res, 'scoring', scoringConfig);
}
