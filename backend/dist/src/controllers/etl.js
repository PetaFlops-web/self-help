import { runEtl } from '../services/etl/runner.js';
import { listEtlErrors as fetchEtlErrors } from '../repositories/etl.js';
import { HttpError, strParam, positiveIntParam, intParam } from '../helpers/http.js';
import { respond } from '../middlewares/response.js';
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
export async function runEtlHandler(req, res) {
    const { source_id, csv_content } = req.body;
    if (!csv_content) {
        throw new HttpError(400, 'csv_content wajib diisi');
    }
    const result = await runEtl(source_id, csv_content);
    respond(res, 200, {
        source_id: result.source_id,
        status: result.status,
        total_rows: result.total_rows,
        accepted: result.accepted,
        rejected: result.rejected,
    });
}
export async function listEtlErrors(req, res) {
    const limit = positiveIntParam(req.query.limit);
    if (req.query.limit !== undefined && limit === undefined) {
        throw new HttpError(400, 'limit harus bilangan bulat positif');
    }
    const offset = intParam(req.query.offset);
    if (req.query.offset !== undefined && (offset === undefined || offset < 0)) {
        throw new HttpError(400, 'offset harus bilangan bulat non-negatif');
    }
    const finalLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const finalOffset = offset ?? 0;
    const result = await fetchEtlErrors({
        source_id: strParam(req.query.source_id),
        limit: finalLimit,
        offset: finalOffset,
    });
    respond(res, 200, {
        etl_errors: result.rows,
        total: result.total,
        limit: finalLimit,
        offset: finalOffset,
    });
}
