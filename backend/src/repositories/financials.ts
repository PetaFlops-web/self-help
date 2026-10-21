import pool from '../config/database.js';
import type { Pembayaran, Progres } from '../types/financials.js';

export async function getPembayaranByProyekId(proyekId: string): Promise<Pembayaran[]> {
  const res = await pool.query<Pembayaran>(
    `SELECT id, proyek_id, termin_ke, tanggal, jumlah, persen_kontrak,
            source_id, source_url, fetched_at, is_dummy
       FROM pembayaran
      WHERE proyek_id = $1
      ORDER BY termin_ke NULLS LAST, tanggal NULLS LAST`,
    [proyekId],
  );
  return res.rows;
}

export async function getProgresByProyekId(proyekId: string): Promise<Progres[]> {
  const res = await pool.query<Progres>(
    `SELECT id, proyek_id, tanggal, persen_fisik, sumber,
            source_id, source_url, fetched_at, is_dummy
       FROM progres
      WHERE proyek_id = $1
      ORDER BY tanggal DESC NULLS LAST`,
    [proyekId],
  );
  return res.rows;
}
