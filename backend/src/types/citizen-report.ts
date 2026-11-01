export interface VerifiedReport {
  tiket: string;
  kategori: string | null;
  ringkasan: string | null;
}

export type ReportStatus = 'Dilaporkan' | 'Diverifikasi' | 'Ditolak';

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

export interface CreateReportInput {
  proyek_id: string;
  kategori: string;
  keterangan: string;
  lat?: number | null;
  lng?: number | null;
  foto_urls?: string[];
  anonim?: boolean;
}

export interface VerifyReportInput {
  status: 'Diverifikasi' | 'Ditolak';
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
  dibuat_pada: Date | null;
  diubah_pada: Date | null;
  proyek: {
    nama: string | null;
    kabupaten: string | null;
  } | null;
}
