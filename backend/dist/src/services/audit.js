import { HttpError, strParam, positiveIntParam, intParam } from '../helpers/http.js';
import { listAuditLogs } from '../repositories/audit.js';
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
export async function getAuditLogs(query) {
    const limit = positiveIntParam(query.limit);
    if (query.limit !== undefined && limit === undefined) {
        throw new HttpError(400, 'limit harus bilangan bulat positif');
    }
    const offset = intParam(query.offset);
    if (query.offset !== undefined && (offset === undefined || offset < 0)) {
        throw new HttpError(400, 'offset harus bilangan bulat non-negatif');
    }
    const finalLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const finalOffset = offset ?? 0;
    const result = await listAuditLogs({
        modul: strParam(query.modul),
        aktor_id: strParam(query.aktor_id),
        start_date: strParam(query.start_date),
        end_date: strParam(query.end_date),
        limit: finalLimit,
        offset: finalOffset,
    });
    return { ...result, limit: finalLimit, offset: finalOffset };
}
