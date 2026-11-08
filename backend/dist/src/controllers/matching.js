import { getUnmatchedWithCandidates, processMatchDecision } from '../services/matching.js';
import { invalidateCache } from '../middlewares/cache.js';
import { recordAudit } from '../helpers/audit.js';
import { respond } from '../middlewares/response.js';
export async function listUnmatched(req, res) {
    const result = await getUnmatchedWithCandidates(req.query);
    respond(res, 200, {
        unmatched: result.rows,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
    });
}
export async function matchDecision(req, res) {
    const body = req.body;
    await processMatchDecision(body);
    await invalidateCache('projects', 'stats');
    const ip = req.headers['x-real-ip'] || req.ip || null;
    await recordAudit({
        aktor_id: req.user?.id ?? null,
        aktor_nama: req.user?.nama ?? 'unknown',
        peran: req.user?.peran ?? 'unknown',
        modul: 'etl',
        aksi: 'MATCH_DECISION',
        target_id: body.unmatched_id,
        diff: { decision: body.decision, matched_id: body.matched_id },
        ip,
    });
    respond(res, 200, { message: 'Keputusan pencocokan berhasil' });
}
