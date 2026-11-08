import pool from '../config/database.js';
export async function insertEtlError(source_id, baris_mentah, alasan) {
    await pool.query(`INSERT INTO etl_error (source_id, baris_mentah, alasan)
     VALUES ($1, $2, $3)`, [source_id, baris_mentah, alasan]);
}
export async function listEtlErrors(filters) {
    const conditions = [];
    const params = [];
    if (filters.source_id) {
        params.push(filters.source_id);
        conditions.push(`source_id = $${params.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) AS count FROM etl_error ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);
    params.push(filters.limit);
    params.push(filters.offset);
    const dataRes = await pool.query(`SELECT id, source_id, baris_mentah, alasan
       FROM etl_error
       ${whereClause}
      ORDER BY id DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}`, params);
    return { rows: dataRes.rows, total };
}
export async function updateSumberData(source_id, row_count) {
    await pool.query(`UPDATE sumber_data SET last_fetched_at = now(), row_count = $2 WHERE source_id = $1`, [source_id, row_count]);
}
export async function getSumberDataById(source_id) {
    const res = await pool.query(`SELECT source_id, nama, url, lisensi, atribusi, boleh_otomatis,
            last_fetched_at, row_count
       FROM sumber_data
      WHERE source_id = $1`, [source_id]);
    return res.rows[0] ?? null;
}
