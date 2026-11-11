import type { EtlParsedRow } from '../../types/etl.js';
import { mapRawRecords, parseRawCsv } from './records.js';

export const SIRUP_FIELD_MAP: Record<string, string> = {
  kode_rup: 'kode_rup',
  kode_tender: 'kode_tender',
  nama_paket: 'nama',
  satker: 'dinas',
  kode_bps: 'kode_bps',
  tahun_anggaran: 'tahun_anggaran',
  pagu: 'pagu',
  hps: 'hps',
  sumber_dana: 'sumber_dana',
  metode_pemilihan: 'metode_pemilihan',
  tgl_pembuatan_rup: 'pengumuman_rup_tgl',
};

export function parseSiRUPCsv(csvContent: string): EtlParsedRow[] {
  const { records } = parseRawCsv(csvContent);
  return mapRawRecords(records, SIRUP_FIELD_MAP, ['nama']);
}
