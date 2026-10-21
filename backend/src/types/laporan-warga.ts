/** Baris laporan warga terverifikasi yang aman dikirim ke LLM (SRS 6.4, 6.8). */
export interface LaporanTerverifikasi {
  tiket: string;
  kategori: string | null;
  /** Teks pelapor dibungkus `<data_pelapor>…</data_pelapor>`; null bila kosong. */
  ringkasan: string | null;
}
