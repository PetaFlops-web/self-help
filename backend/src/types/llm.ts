/**
 * Tipe kontrak antara Main Backend dan llm-service (SRS 6.4 / 6.5).
 */

export type LlmTugas = 'explain' | 'draft';

export interface LlmProyekInput {
  id?: string;
  nama?: string;
  dinas?: string | null;
  kabupaten?: string | null;
  tahun_anggaran?: number;
  pagu?: number | null;
  nilai_kontrak?: number | null;
  is_dummy?: boolean;
}

export interface LlmIndicatorInput {
  kode_aturan: string;
  dimensi: string;
  tingkat: string;
  nilai: number | null;
  ambang: number | null;
  uraian_aturan: string;
  sumber: string;
  tanggal_data?: string;
}

/** Payload yang dikirim ke POST /internal/generate (SRS 6.4). */
export interface LlmGeneratePayload {
  versi_prompt: string;
  tugas: LlmTugas;
  proyek: LlmProyekInput;
  skor: {
    total: number | null;
    kategori: string | null;
    dimensi: Record<string, number | null>;
  };
  indikator: LlmIndicatorInput[];
  dimensi_data_belum_cukup: string[];
  laporan_terverifikasi: Array<Record<string, unknown>>;
  tujuan_pembaca: string;
}

export interface LlmTemuanOutput {
  kode_aturan: string;
  penjelasan: string;
  arti_bagi_warga: string;
}

/** Keluaran T1 (penjelasan berbahasa awam), SRS 6.5. */
export interface LlmExplainOutput {
  ringkasan: string;
  temuan: LlmTemuanOutput[];
  keterbatasan: string[];
  saran_tindak_lanjut: Array<{ langkah: string; lembaga: string }>;
  penafian: string;
}

/** Keluaran T2 (draf laporan tindak lanjut), SRS 6.5. */
export interface LlmDraftOutput {
  kepada: string;
  perihal: string;
  pembuka: string;
  uraian_indikator: LlmTemuanOutput[];
  permohonan: string;
  penutup: string;
  penafian: string;
  lampiran_disarankan: string[];
}

export type LlmOutput = LlmExplainOutput | LlmDraftOutput;

/** Lembaga tujuan draf yang sah (SRS 6.5). */
export const LEMBAGA_TUJUAN = ['inspektorat', 'BPK', 'KPK', 'Ombudsman', 'dinas_terkait'] as const;
export type LembagaTujuan = (typeof LEMBAGA_TUJUAN)[number];
