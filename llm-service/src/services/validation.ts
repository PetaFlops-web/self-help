import {
  OutputSchema,
  DraftOutputSchema,
  type DraftOutput,
  type LlmOutput,
} from '../types/llm.js';
import { findForbiddenPhrases } from './forbidden-phrases.js';

export const STANDARD_DISCLAIMER =
  'Ini indikator risiko untuk diperiksa, bukan bukti pelanggaran atau kesimpulan hukum.';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function parseLlmJson(raw: string): unknown {
  let text = raw.trim();

  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fence) text = fence[1].trim();

  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError('Keluaran LLM bukan JSON yang valid');
  }
}

function filterKodeAturan(output: LlmOutput, allowedCodes: Set<string>): LlmOutput {
  const temuan = output.temuan.filter((t) => allowedCodes.has(t.kode_aturan));
  return { ...output, temuan };
}

function ensurePenafian(output: LlmOutput): LlmOutput {
  if (output.penafian.toLowerCase().includes('bukan bukti')) return output;
  return {
    ...output,
    penafian: output.penafian
      ? `${output.penafian} ${STANDARD_DISCLAIMER}`
      : STANDARD_DISCLAIMER,
  };
}

const NUMBER_RE = /\d+(?:[.,]\d+)*/g;

function digitSignature(token: string): string {
  return token.replace(/[^0-9]/g, '');
}

function numericValue(token: string): number | null {
  const seps = (token.match(/[.,]/g) ?? []).length;
  const n = seps > 1 ? Number(token.replace(/[.,]/g, '')) : Number(token.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function collectNumbers(input: unknown): Set<string> {
  const set = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      set.add(digitSignature(String(v)));
    } else if (typeof v === 'string') {
      for (const m of v.match(NUMBER_RE) ?? []) {
        set.add(digitSignature(m));
      }
    } else if (Array.isArray(v)) {
      for (const item of v) walk(item);
    } else if (v && typeof v === 'object') {
      for (const item of Object.values(v)) walk(item);
    }
  };
  walk(input);
  return set;
}

export function findUnknownNumbers(text: string, allowed: Set<string>): string[] {
  const unknown: string[] = [];
  for (const m of text.match(NUMBER_RE) ?? []) {
    const value = numericValue(m);
    if (value !== null && value < 10) continue;
    if (!allowed.has(digitSignature(m))) unknown.push(m);
  }
  return unknown;
}

export interface ValidateOptions {
  allowedCodes: Set<string>;
  allowedNumbers: Set<string>;
}

export function validateOutput(
  raw: string,
  opts: ValidateOptions,
): LlmOutput {
  const parsed = parseLlmJson(raw);

  const result = OutputSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(`Struktur JSON tidak sesuai skema (${issues})`);
  }

  let output = result.data;

  output = filterKodeAturan(output, opts.allowedCodes);
  if (output.temuan.length === 0) {
    throw new ValidationError('Semua temuan memiliki kode_aturan yang tidak ada di masukan');
  }

  // Pastikan jumlah temuan tidak melebihi batas yang dijanjikan (maks 6)
  output.temuan = output.temuan.slice(0, 6);

  // Pastikan tiap teks tidak melebihi batas skema
  for (const t of output.temuan) {
    if (t.penjelasan.length > 400) t.penjelasan = t.penjelasan.slice(0, 400);
    if (t.arti_bagi_warga.length > 250) t.arti_bagi_warga = t.arti_bagi_warga.slice(0, 250);
  }

  const unknown = findUnknownNumbers(JSON.stringify(output), opts.allowedNumbers);
  if (unknown.length > 0) {
    throw new ValidationError(
      `Angka di keluaran tidak ada di masukan: ${[...new Set(unknown)].join(', ')}`,
    );
  }

  output = ensurePenafian(output);

  return output;
}

export function checkForbiddenPhrases(output: unknown): void {
  const text = JSON.stringify(output);
  const found = findForbiddenPhrases(text);
  if (found.length > 0) {
    throw new ValidationError(`Keluaran memuat frasa terlarang: ${found.join(', ')}`);
  }
}

export function validateDraftOutput(raw: string, opts: ValidateOptions): DraftOutput {
  const parsed = parseLlmJson(raw);

  const result = DraftOutputSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(`Struktur JSON tidak sesuai skema (${issues})`);
  }

  let output = result.data;

  output = {
    ...output,
    uraian_indikator: output.uraian_indikator.filter((t) =>
      opts.allowedCodes.has(t.kode_aturan),
    ),
  };
  if (output.uraian_indikator.length === 0) {
    throw new ValidationError('Semua uraian_indikator memiliki kode_aturan yang tidak ada di masukan');
  }

  // Pastikan jumlah uraian indikator tidak melebihi batas yang dijanjikan (maks 6)
  output.uraian_indikator = output.uraian_indikator.slice(0, 6);

  // Pastikan tiap teks tidak melebihi batas skema
  for (const u of output.uraian_indikator) {
    if (u.penjelasan.length > 400) u.penjelasan = u.penjelasan.slice(0, 400);
    if (u.arti_bagi_warga.length > 250) u.arti_bagi_warga = u.arti_bagi_warga.slice(0, 250);
  }

  const unknown = findUnknownNumbers(JSON.stringify(output), opts.allowedNumbers);
  if (unknown.length > 0) {
    throw new ValidationError(
      `Angka di keluaran tidak ada di masukan: ${[...new Set(unknown)].join(', ')}`,
    );
  }

  if (!output.penafian.toLowerCase().includes('bukan bukti')) {
    output = {
      ...output,
      penafian: output.penafian
        ? `${output.penafian} ${STANDARD_DISCLAIMER}`
        : STANDARD_DISCLAIMER,
    };
  }

  return output;
}
