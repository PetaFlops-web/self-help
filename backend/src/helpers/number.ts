export function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function isPresent(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
