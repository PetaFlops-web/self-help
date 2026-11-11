import type { EtlRawRow, EtlValidatedRow } from '../../types/etl.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function parseBoundedYear(
  rawValue: string | undefined,
  fieldName: string,
): { ok: true; value: number } | { ok: false; reason: string } {
  const tahunRaw = (rawValue ?? '').trim();
  if (!tahunRaw) {
    return { ok: false, reason: `${fieldName} wajib diisi` };
  }
  const tahunNum = Number(tahunRaw);
  if (!Number.isInteger(tahunNum)) {
    return { ok: false, reason: `${fieldName} harus bilangan bulat` };
  }
  if (tahunNum < MIN_YEAR || tahunNum > MAX_YEAR) {
    return { ok: false, reason: `${fieldName} harus antara ${MIN_YEAR} dan ${MAX_YEAR}` };
  }
  return { ok: true, value: tahunNum };
}

export function parseNonNegativeBigInt(
  rawValue: string | undefined,
  fieldName: string,
  required = false,
): { ok: true; value: string } | { ok: false; reason: string } {
  const trimmed = (rawValue ?? '').trim();
  if (required && !trimmed) {
    return { ok: false, reason: `${fieldName} wajib diisi` };
  }
  let parsed: bigint;
  try {
    parsed = BigInt(trimmed);
  } catch {
    return { ok: false, reason: `${fieldName} harus bilangan bulat non-negatif` };
  }
  if (parsed < 0n) {
    return { ok: false, reason: `${fieldName} tidak boleh negatif` };
  }
  return { ok: true, value: parsed.toString() };
}

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function validateProjectRow(
  row: EtlRawRow,
  validKodeBps: Set<string>,
): { ok: true; data: EtlValidatedRow } | { ok: false; reason: string } {
  const kode_rup = (row.kode_rup ?? '').trim();
  if (!kode_rup) {
    return { ok: false, reason: 'kode_rup wajib diisi' };
  }

  const nama = (row.nama ?? '').trim();
  if (!nama) {
    return { ok: false, reason: 'nama wajib diisi' };
  }

  const dinas = (row.dinas ?? '').trim();
  const kode_tender = (row.kode_tender ?? '').trim() || null;

  const kode_bps = (row.kode_bps ?? '').trim();
  if (!kode_bps || !validKodeBps.has(kode_bps)) {
    return { ok: false, reason: 'kode_bps tidak terdaftar di wilayah' };
  }

  const tahunCheck = parseBoundedYear(row.tahun_anggaran, 'tahun_anggaran');
  if (!tahunCheck.ok) {
    return tahunCheck;
  }
  const tahunNum = tahunCheck.value;

  const paguCheck = parseNonNegativeBigInt(row.pagu, 'pagu');
  if (!paguCheck.ok) {
    return paguCheck;
  }
  const pagu = paguCheck.value;

  let hps: string | null = null;
  const hpsRaw = (row.hps ?? '').trim();
  if (hpsRaw) {
    const hpsCheck = parseNonNegativeBigInt(hpsRaw, 'hps');
    if (!hpsCheck.ok) {
      return hpsCheck;
    }
    hps = hpsCheck.value;
  }

  const sumber_dana = (row.sumber_dana ?? '').trim() || null;
  const metode_pemilihan = (row.metode_pemilihan ?? '').trim() || null;

  let pengumuman_rup_tgl: string | null = null;
  const tglRaw = (row.pengumuman_rup_tgl ?? '').trim();
  if (tglRaw) {
    if (!isValidDate(tglRaw)) {
      return { ok: false, reason: 'pengumuman_rup_tgl harus tanggal valid (YYYY-MM-DD)' };
    }
    pengumuman_rup_tgl = tglRaw;
  }

  const data: EtlValidatedRow = {
    kode_rup,
    kode_tender,
    nama,
    dinas,
    kode_bps,
    tahun_anggaran: tahunNum,
    pagu,
    hps,
    sumber_dana,
    metode_pemilihan,
    pengumuman_rup_tgl,
  };

  return { ok: true, data };
}
