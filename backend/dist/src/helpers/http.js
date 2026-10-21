const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
    }
}
export function strParam(v) {
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}
function asNumber(v) {
    if (typeof v === 'string' && v.trim() === '')
        return undefined;
    if (typeof v !== 'string' && typeof v !== 'number')
        return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
export function intParam(v) {
    const n = asNumber(v);
    return n !== undefined && Number.isInteger(n) ? n : undefined;
}
export function positiveIntParam(v) {
    const n = asNumber(v);
    return n !== undefined && Number.isInteger(n) && n > 0 ? n : undefined;
}
export function isUuid(v) {
    return UUID_RE.test(v);
}
