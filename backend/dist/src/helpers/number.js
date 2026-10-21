export function toNum(v) {
    if (v === null || v === undefined)
        return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}
export function isPresent(v) {
    return typeof v === 'number' && Number.isFinite(v);
}
