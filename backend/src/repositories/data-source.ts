import pool from '../config/database.js';
import type { DataSource } from '../types/data-source.js';

export async function listDataSources(): Promise<DataSource[]> {
  const res = await pool.query<DataSource>(
    `SELECT source_id, nama, url, lisensi, atribusi, boleh_otomatis,
            last_fetched_at, row_count
       FROM sumber_data
      ORDER BY source_id`,
  );
  return res.rows;
}
