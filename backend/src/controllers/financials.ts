import type { Request, Response } from 'express';
import * as financialsService from '../services/financials.js';
import { ok } from '../middlewares/response.js';

export async function getProjectPayments(req: Request<{ id: string }>, res: Response): Promise<void> {
  const id = req.params.id;
  const result = await financialsService.getProjectPayments(id);
  ok(res, 'payments', result);
}

export async function getProjectProgress(req: Request<{ id: string }>, res: Response): Promise<void> {
  const id = req.params.id;
  const result = await financialsService.getProjectProgress(id);
  ok(res, 'progress', result);
}
