import pool from '../config/database.js';
import type { SumberData } from '../types/sumber-data.js';

export async function listSumberData(): Promise<SumberData[]> {
  const res = await pool.query<SumberData>(
    `SELECT source_id, nama, url, lisensi, atribusi, boleh_otomatis,
            last_fetched_at, row_count
       FROM sumber_data
      ORDER BY source_id`,
  );
  return res.rows;
}
