import { z } from 'zod';

export type Dimension = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6';
export type Tingkat = 'rendah' | 'sedang' | 'tinggi';

export interface InputIndicator {
  kode_aturan: string;
  dimensi?: string;
  tingkat?: string;
  nilai?: number | null;
  ambang?: number | null;
  uraian_aturan?: string;
  sumber?: string;
  tanggal_data?: string;
  [key: string]: unknown;
}

export interface InputProyek {
  id?: string;
  nama?: string;
  dinas?: string;
  kabupaten?: string;
  tahun_anggaran?: number;
  pagu?: number;
  nilai_kontrak?: number;
  is_dummy?: boolean;
  [key: string]: unknown;
}

export interface InputSkor {
  total?: number | null;
  kategori?: string;
  dimensi?: Record<string, number | null>;
  [key: string]: unknown;
}

export interface LlmGenerateRequest {
  versi_prompt?: string;
  /** Jenis tugas LLM: penjelasan (T1) atau draf laporan (T2). Default: explain. */
  tugas?: 'explain' | 'draft';
  proyek?: InputProyek;
  skor?: InputSkor;
  indikator?: InputIndicator[];
  dimensi_data_belum_cukup?: string[];
  laporan_terverifikasi?: Array<Record<string, unknown>>;
  tujuan_pembaca?: string;
  [key: string]: unknown;
}

export const GenerateInputSchema = z
  .object({
    versi_prompt: z.string().optional(),
    tugas: z.enum(['explain', 'draft']).optional(),
    proyek: z.record(z.string(), z.unknown()).optional(),
    skor: z.record(z.string(), z.unknown()).optional(),
    indikator: z.array(z.record(z.string(), z.unknown())).optional(),
    dimensi_data_belum_cukup: z.array(z.string()).optional(),
    laporan_terverifikasi: z.array(z.record(z.string(), z.unknown())).optional(),
    tujuan_pembaca: z.string().optional(),
  })
  .passthrough();

export const LembagaSchema = z.enum([
  'inspektorat',
  'BPK',
  'KPK',
  'Ombudsman',
  'dinas_terkait',
]);

export const TemuanSchema = z.object({
  kode_aturan: z.string().min(1),
  penjelasan: z.string().min(1).max(300),
  arti_bagi_warga: z.string().min(1).max(200),
});

export const SaranTindakLanjutSchema = z.object({
  langkah: z.string().min(1),
  lembaga: LembagaSchema,
});

export const OutputSchema = z.object({
  ringkasan: z.string().min(1).max(400),
  temuan: z.array(TemuanSchema).min(1).max(6),
  keterbatasan: z.array(z.string()),
  saran_tindak_lanjut: z.array(SaranTindakLanjutSchema),
  penafian: z.string().min(1),
});

export type LlmOutput = z.infer<typeof OutputSchema>;
export type Lembaga = z.infer<typeof LembagaSchema>;

/** Skema keluaran T2 (draf laporan tindak lanjut), SRS 6.5. */
export const UraianIndikatorSchema = z.object({
  kode_aturan: z.string().min(1),
  penjelasan: z.string().min(1).max(300),
  arti_bagi_warga: z.string().min(1).max(200),
});

export const DraftOutputSchema = z.object({
  kepada: z.string().min(1),
  perihal: z.string().min(1),
  pembuka: z.string().min(1),
  uraian_indikator: z.array(UraianIndikatorSchema).min(1).max(6),
  permohonan: z.string().min(1),
  penutup: z.string().min(1),
  penafian: z.string().min(1),
  lampiran_disarankan: z.array(z.string()),
});

export type DraftOutput = z.infer<typeof DraftOutputSchema>;