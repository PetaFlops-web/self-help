import pool from '../config/database.js';
import type { WilayahRow } from '../types/wilayah.js';

export async function listWilayah(): Promise<WilayahRow[]> {
  const res = await pool.query<WilayahRow>(
    'SELECT kode_bps, nama, lat, lng, geojson FROM wilayah ORDER BY nama',
  );
  return res.rows;
}
