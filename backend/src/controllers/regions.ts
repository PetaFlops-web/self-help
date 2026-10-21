import type { Request, Response } from 'express';
import { getRegionsGeoJSON } from '../services/regions.js';
import { ok } from '../middlewares/response.js';

export async function getRegions(_req: Request, res: Response): Promise<void> {
  const regions = await getRegionsGeoJSON();
  ok(res, 'regions', regions);
}
