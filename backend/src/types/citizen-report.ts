/** Baris laporan warga terverifikasi yang aman dikirim ke LLM (SRS 6.4, 6.8). */
export interface VerifiedReport {
  tiket: string;
  kategori: string | null;
  /** Teks pelapor dibungkus `<data_pelapor>…</data_pelapor>`; null bila kosong. */
  ringkasan: string | null;
}

/** Status lifecycle laporan warga. */
export type ReportStatus = 'Dilaporkan' | 'Diverifikasi' | 'Ditolak';

/** Model baris tabel `laporan_warga`. */
export interface CitizenReport {
  tiket: string;
  proyek_id: string | null;
  kategori: string | null;
  keterangan: string | null;
  lat: string | null;
  lng: string | null;
  foto_urls: string[] | null;
  anonim: boolean;
  status: ReportStatus | string;
  alasan_tolak: string | null;
  catatan_verifikator: string | null;
  dibuat_pada: Date | null;
  diubah_pada: Date | null;
}

/** Payload untuk membuat laporan warga baru (POST /api/reports). */
export interface CreateReportInput {
  proyek_id: string;
  kategori: string;
  keterangan: string;
  lat?: number | null;
  lng?: number | null;
  foto_urls?: string[];
  anonim?: boolean;
}

/** Payload verifikasi laporan oleh admin (PATCH /api/admin/reports/:id). */
export interface VerifyReportInput {
  status: 'Diverifikasi' | 'Ditolak';
  catatan_verifikator?: string;
  alasan_tolak?: string;
}

/** Response publik untuk tracking laporan (tidak mengekspos data pribadi). */
export interface ReportPublicView {
  tiket: string;
  proyek_id: string | null;
  kategori: string | null;
  status: ReportStatus | string;
  keterangan: string | null;
  catatan_verifikator: string | null;
  alasan_tolak: string | null;
  dibuat_pada: Date | null;
  diubah_pada: Date | null;
  proyek: {
    nama: string | null;
    kabupaten: string | null;
  } | null;
}
