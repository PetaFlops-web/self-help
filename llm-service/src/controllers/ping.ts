import type { Request, Response } from 'express';

export function getPing(_req: Request, res: Response): void {
  res.status(200).json({ success: true, service: 'llm-service', status: 'ok' });
}
