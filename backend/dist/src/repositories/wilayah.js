import pool from '../config/database.js';
export async function listWilayah() {
    const res = await pool.query('SELECT kode_bps, nama, lat, lng, geojson FROM wilayah ORDER BY nama');
    return res.rows;
}
