/** Baris tabel `proyek` (SRS 4.2) + nama kabupaten dari join `wilayah`. */
export interface Project {
  id: string;
  kode_rup: string | null;
  kode_tender: string | null;
  nama: string;
  dinas: string | null;
  kode_bps: string | null;
  lat: string | null;
  lng: string | null;
  tahun_anggaran: number;
  sumber_dana: string | null;
  metode_pemilihan: string | null;
  pagu: string | null;
  hps: string | null;
  nilai_kontrak: string | null;
  status: string | null;
  pengumuman_rup_tgl: Date | null;
  match_status: string | null;
  skor_total: string | null;
  kategori: string | null;
  is_dummy: boolean;
  source_id: string | null;
  source_url: string | null;
  fetched_at: Date | null;
  kabupaten: string | null;
}

export interface ProjectFilters {
  kode_bps?: string;
  dinas?: string;
  kategori?: string;
  tahun_anggaran?: number;
  q?: string;
  pagu_min?: number;
  pagu_max?: number;
  nilai_kontrak_min?: number;
  nilai_kontrak_max?: number;
  limit?: number;
}

/** Baris tabel `indikator_temuan` (SRS 4.5). */
export interface IndicatorFindingRow {
  id: string;
  dimensi: string | null;
  kode_aturan: string | null;
  nilai_terukur: string | null;
  ambang: string | null;
  tingkat: string | null;
  bukti_ref: Record<string, unknown> | null;
  sumber: string | null;
  uraian_aturan: string | null;
  dihitung_pada: Date | null;
}

/** Hasil agregasi ringkas beranda (FR-05). */
export interface StatsSummary {
  total_proyek: number;
  rendah: number;
  perlu_perhatian: number;
  tinggi: number;
  rata_rata_skor: number | null;
}

export interface ProjectRow {
  hps: unknown;
  nilai_kontrak: unknown;
}

export interface TenderRow {
  jumlah_penawar: unknown;
  harga_penawaran_menang: unknown;
  hari_rup_ke_tender: unknown;
}

export interface RabTotalsRow {
  total_acuan: unknown;
}
