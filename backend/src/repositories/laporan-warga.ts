import pool from '../config/database.js';
import type { LaporanTerverifikasi } from '../types/laporan-warga.js';

/** Daftar laporan warga berstatus Diverifikasi untuk proyek (LLM-02). */
export async function listLaporanTerverifikasi(proyekId: string): Promise<LaporanTerverifikasi[]> {
  const res = await pool.query<{ tiket: string; kategori: string | null; keterangan: string | null }>(
    `SELECT tiket, kategori, keterangan
       FROM laporan_warga
      WHERE proyek_id = $1 AND status = 'Diverifikasi'
      ORDER BY tiket
      LIMIT 20`,
    [proyekId],
  );

  return res.rows.map((r) => ({
    tiket: r.tiket,
    kategori: r.kategori,
    ringkasan: wrapDataPelapor(r.keterangan),
  }));
}

/**
 * Teks pelapor dibungkus sebagai data tak tepercaya sebelum dikirim ke LLM
 * (SRS 6.8): tag/instruksi dibersihkan dan dibatasi 500 karakter.
 */
function wrapDataPelapor(keterangan: string | null): string | null {
  if (!keterangan) return null;
  const cleaned = keterangan
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  return cleaned.length > 0 ? `<data_pelapor>${cleaned}</data_pelapor>` : null;
}
