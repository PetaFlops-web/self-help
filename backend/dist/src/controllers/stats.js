import { getStatsSummary } from '../services/stats.js';
import { ok } from '../middlewares/response.js';
export async function getStats(_req, res) {
    const stats = await getStatsSummary();
    ok(res, 'stats', stats);
}
