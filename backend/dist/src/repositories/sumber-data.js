import pool from '../config/database.js';
export async function listSumberData() {
    const res = await pool.query(`SELECT source_id, nama, url, lisensi, atribusi, boleh_otomatis,
            last_fetched_at, row_count
       FROM sumber_data
      ORDER BY source_id`);
    return res.rows;
}
