export type EtlRawRow = Record<string, string>;

export interface EtlParsedRow {
  normalized: EtlRawRow;
  raw: EtlRawRow;
}

export interface EtlValidatedRow {
  kode_rup: string;
  kode_tender: string | null;
  nama: string;
  dinas: string;
  kode_bps: string;
  tahun_anggaran: number;
  pagu: string;
  hps: string | null;
  sumber_dana: string | null;
  metode_pemilihan: string | null;
  pengumuman_rup_tgl: string | null;
}

export interface EtlRunResult {
  source_id: string;
  status: 'success' | 'partial' | 'failed';
  total_rows: number;
  accepted: number;
  rejected: number;
}

export interface EtlErrorRow {
  id: string;
  source_id: string | null;
  baris_mentah: Record<string, unknown> | null;
  alasan: string | null;
}

export interface EtlErrorListResult {
  rows: EtlErrorRow[];
  total: number;
}
