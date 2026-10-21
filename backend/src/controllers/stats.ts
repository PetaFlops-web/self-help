import type { Request, Response } from 'express';
import { getStatsSummary } from '../services/stats.js';
import { ok } from '../middlewares/response.js';

export async function getStats(_req: Request, res: Response): Promise<void> {
  const stats = await getStatsSummary();
  ok(res, 'stats', stats);
}
