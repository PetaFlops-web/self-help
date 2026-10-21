import type { Request, Response } from 'express';
import { checkHealth } from '../services/health.js';
import { respond } from '../middlewares/response.js';

export async function getPing(_req: Request, res: Response): Promise<void> {
  const result = await checkHealth();
  respond(res, 200, {
    message: 'Test Ping Server Active !!!',
    database_time: result.database_time,
    redis_status: result.redis_status,
  });
}
