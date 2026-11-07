import type { Request, Response } from 'express';
import { getAuditLogs } from '../services/audit.js';
import { respond } from '../middlewares/response.js';

export async function listAudit(req: Request, res: Response): Promise<void> {
  const result = await getAuditLogs(req.query as Record<string, unknown>);

  respond(res, 200, {
    audit_logs: result.rows,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}
