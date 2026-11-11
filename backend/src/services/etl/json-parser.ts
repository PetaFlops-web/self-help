import type { EtlParsedRow } from '../../types/etl.js';
import { mapRawRecords, parseRawJson } from './records.js';

export const JSON_PROJECT_FIELD_MAP: Record<string, string> = {
  kode_rup: 'kode_rup',
  kode_tender: 'kode_tender',
  nama_paket: 'nama',
  nama: 'nama',
  satker: 'dinas',
  dinas: 'dinas',
  kode_bps: 'kode_bps',
  tahun_anggaran: 'tahun_anggaran',
  pagu: 'pagu',
  hps: 'hps',
  sumber_dana: 'sumber_dana',
  metode_pemilihan: 'metode_pemilihan',
  tgl_pembuatan_rup: 'pengumuman_rup_tgl',
  pengumuman_rup_tgl: 'pengumuman_rup_tgl',
};

export function parseJsonImport(jsonContent: string): EtlParsedRow[] {
  const { records } = parseRawJson(jsonContent, 'JSON harus berupa array objek proyek');
  return mapRawRecords(records, JSON_PROJECT_FIELD_MAP);
}
