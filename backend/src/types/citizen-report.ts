export interface VerifiedReport {
  tiket: string;
  kategori: string | null;
  ringkasan: string | null;
}

export type ReportStatus =
  | 'Dilaporkan'
  | 'Diverifikasi'
  | 'Diteruskan'
  | 'Ditindaklanjuti'
  | 'Selesai'
  | 'Ditolak';

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
  lembaga_tujuan: string | null;
  diteruskan_pada: Date | null;
  dibuat_pada: Date | null;
  diubah_pada: Date | null;
}

export interface CreateReportInput {
  proyek_id: string;
  kategori: string;
  keterangan: string;
  lat?: number | null;
  lng?: number | null;
  foto_urls?: string[];
  anonim?: boolean;
  ukuran_lapangan?: number | null;
  nama_pelapor?: string | null;
  surel_pelapor?: string | null;
  telepon_pelapor?: string | null;
}

export interface VerifyReportInput {
  status: ReportStatus;
  catatan_verifikator?: string;
  alasan_tolak?: string;
}

export interface ReportPublicView {
  tiket: string;
  proyek_id: string | null;
  kategori: string | null;
  status: ReportStatus | string;
  keterangan: string | null;
  catatan_verifikator: string | null;
  alasan_tolak: string | null;
  foto_urls: string[] | null;
  anonim: boolean;
  lat: string | null;
  lng: string | null;
  lembaga_tujuan: string | null;
  diteruskan_pada: Date | null;
  dibuat_pada: Date | null;
  diubah_pada: Date | null;
  proyek: {
    nama: string | null;
    kabupaten: string | null;
  } | null;
}

export interface AdminReportListItem {
  tiket: string;
  kategori: string | null;
  status: string;
  dibuat_pada: Date | null;
  proyek: {
    nama: string | null;
    kabupaten: string | null;
    kode_bps: string | null;
  } | null;
}

export interface RecapReportRow {
  tiket: string;
  kategori: string | null;
  status: string;
  keterangan: string | null;
  catatan_verifikator: string | null;
  alasan_tolak: string | null;
  dibuat_pada: Date | null;
  diubah_pada: Date | null;
  proyek_nama: string | null;
  proyek_kabupaten: string | null;
  proyek_kode_bps: string | null;
  proyek_is_dummy: boolean;
}

export interface DailyReportTrendItem {
  tanggal: string;
  total_masuk: number;
  diverifikasi: number;
  selesai: number;
  ditolak: number;
}

export interface AdminReportDetail {
  tiket: string;
  proyek_id: string | null;
  kategori: string | null;
  keterangan: string | null;
  lat: string | null;
  lng: string | null;
  foto_urls: string[] | null;
  anonim: boolean;
  status: string;
  alasan_tolak: string | null;
  catatan_verifikator: string | null;
  lembaga_tujuan: string | null;
  diteruskan_pada: Date | null;
  dibuat_pada: Date | null;
  diubah_pada: Date | null;
  proyek: {
    nama: string | null;
    kabupaten: string | null;
    kode_bps: string | null;
  } | null;
}
