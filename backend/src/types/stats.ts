export interface StatsResponse {
  total_proyek: number;
  kategori: {
    Rendah: number;
    'Perlu Perhatian': number;
    Tinggi: number;
  };
  rata_rata_skor: number | null;
}