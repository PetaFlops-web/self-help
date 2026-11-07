import { getAuditLogs } from '../services/audit.js';
import { respond } from '../middlewares/response.js';
export async function listAudit(req, res) {
    const result = await getAuditLogs(req.query);
    respond(res, 200, {
        audit_logs: result.rows,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
    });
}
