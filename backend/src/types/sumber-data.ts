/** Baris tabel `sumber_data` (SRS 4.1). */
export interface SumberData {
  source_id: string;
  nama: string;
  url: string | null;
  lisensi: string | null;
  atribusi: string | null;
  boleh_otomatis: boolean;
  last_fetched_at: Date | null;
  row_count: number | null;
}
