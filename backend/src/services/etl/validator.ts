import type { EtlRawRow, EtlValidatedRow } from '../../types/etl.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

  const kode_bps = (row.kode_bps ?? '').trim();
  if (!kode_bps || !validKodeBps.has(kode_bps)) {
    return { ok: false, reason: 'kode_bps tidak terdaftar di wilayah' };
  }

  const tahunRaw = (row.tahun_anggaran ?? '').trim();
  const tahunNum = Number(tahunRaw);
  if (!Number.isInteger(tahunNum)) {
    return { ok: false, reason: 'tahun_anggaran harus bilangan bulat' };
  }

  const paguRaw = (row.pagu ?? '').trim();
  let paguBigInt: bigint;
  try {
    paguBigInt = BigInt(paguRaw);
  } catch {
    return { ok: false, reason: 'pagu harus bilangan bulat non-negatif' };
  }
  if (paguBigInt < 0n) {
    return { ok: false, reason: 'pagu tidak boleh negatif' };
  }
  const pagu = paguBigInt.toString();

  let hps: string | null = null;
  const hpsRaw = (row.hps ?? '').trim();
  if (hpsRaw) {
    let hpsBigInt: bigint;
    try {
      hpsBigInt = BigInt(hpsRaw);
    } catch {
      return { ok: false, reason: 'hps harus bilangan bulat non-negatif' };
    }
    if (hpsBigInt < 0n) {
      return { ok: false, reason: 'hps tidak boleh negatif' };
    }
    hps = hpsBigInt.toString();
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
