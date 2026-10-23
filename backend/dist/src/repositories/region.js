import pool from '../config/database.js';
export async function listRegions() {
    const res = await pool.query('SELECT kode_bps, nama, lat, lng, geojson FROM wilayah ORDER BY nama');
    return res.rows;
}
