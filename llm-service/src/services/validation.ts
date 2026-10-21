import {
  OutputSchema,
  DraftOutputSchema,
  type DraftOutput,
  type LlmOutput,
} from '../types/llm.js';
import { findForbiddenPhrases } from './forbidden-phrases.js';

export const STANDARD_DISCLAIMER =
  'Ini indikator risiko untuk diperiksa, bukan bukti pelanggaran atau kesimpulan hukum.';

/** Galat validasi keluaran LLM; dipetakan ke HTTP 422 oleh controller. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Galat provider/koneksi LLM; dipetakan ke HTTP 503 oleh controller. */
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

/** Mengubah teks mentah LLM menjadi objek JSON (toleran markdown fence). */
export function parseLlmJson(raw: string): unknown {
  let text = raw.trim();

  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fence) text = fence[1].trim();

  // Bila model membungkus dengan teks sebelum/sesudah JSON, ambil bagian JSON.
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

// ---------- Pemeriksaan angka (SRS 6.7 langkah 3, LLM-05) ----------

/** Pola angka yang toleran terhadap pemisah ribuan/desimal (mis. 6.980.867.932, 99,5). */
const NUMBER_RE = /\d+(?:[.,]\d+)*/g;

/** Tanda digit sebuah angka (pemisah dihapus) agar "6.980.867.932" == "6980867932". */
function digitSignature(token: string): string {
  return token.replace(/[^0-9]/g, '');
}

/** Nilai numerik token; >1 pemisah dianggap ribuan, 1 pemisah dianggap desimal. */
function numericValue(token: string): number | null {
  const seps = (token.match(/[.,]/g) ?? []).length;
  const n = seps > 1 ? Number(token.replace(/[.,]/g, '')) : Number(token.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Mengumpulkan tanda digit semua angka yang muncul di masukan (nilai angka maupun angka di dalam string). */
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

/**
 * Mencari angka pada teks yang TIDAK ada di masukan.
 * Angka di bawah 10 selalu diizinkan karena lazim muncul pada kode aturan
 * (mis. "D2-01") dan nomor urut, sehingga tidak menimbulkan salah tolak.
 */
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

/**
 * Validasi lengkap keluaran LLM (SRS 6.7):
 * 1) JSON valid + sesuai skema 6.5 (Zod),
 * 2) kode_aturan ada di masukan (item tak cocok dibuang; kosong = tolak),
 * 3) angka di teks harus ada di masukan,
 * 5) penafian wajib memuat "bukan bukti" (ditambahkan bila absen).
 *
 * Langkah 4 (frasa terlarang) dilakukan terpisah via checkForbiddenPhrases.
 */
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

  const unknown = findUnknownNumbers(JSON.stringify(output), opts.allowedNumbers);
  if (unknown.length > 0) {
    throw new ValidationError(
      `Angka di keluaran tidak ada di masukan: ${[...new Set(unknown)].join(', ')}`,
    );
  }

  output = ensurePenafian(output);

  return output;
}

/** Langkah 4 SRS 6.7: tolak keluaran yang memuat frasa terlarang. */
export function checkForbiddenPhrases(output: unknown): void {
  const text = JSON.stringify(output);
  const found = findForbiddenPhrases(text);
  if (found.length > 0) {
    throw new ValidationError(`Keluaran memuat frasa terlarang: ${found.join(', ')}`);
  }
}

/**
 * Validasi lengkap keluaran T2 (draf laporan, SRS 6.7) — sama dengan T1,
 * tetapi memakai skema 6.5 T2 dan menyaring `uraian_indikator`.
 */
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
