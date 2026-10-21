const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function strParam(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'string' && v.trim() === '') return undefined;
  if (typeof v !== 'string' && typeof v !== 'number') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function intParam(v: unknown): number | undefined {
  const n = asNumber(v);
  return n !== undefined && Number.isInteger(n) ? n : undefined;
}

export function positiveIntParam(v: unknown): number | undefined {
  const n = asNumber(v);
  return n !== undefined && Number.isInteger(n) && n > 0 ? n : undefined;
}

export function nonNegativeNumberParam(v: unknown): number | undefined {
  const n = asNumber(v);
  return n !== undefined && n >= 0 ? n : undefined;
}

export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}
