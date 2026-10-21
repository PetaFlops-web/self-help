import type { Request, Response } from 'express';
import * as sourcesService from '../services/sources.js';
import { ok } from '../middlewares/response.js';

export async function listSources(_req: Request, res: Response): Promise<void> {
  const sources = await sourcesService.listSources();
  ok(res, 'sources', sources);
}
