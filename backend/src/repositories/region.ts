import pool from '../config/database.js';
import type { RegionRow } from '../types/region.js';

export async function listRegions(): Promise<RegionRow[]> {
  const res = await pool.query<RegionRow>(
    'SELECT kode_bps, nama, lat, lng, geojson FROM wilayah ORDER BY nama',
  );
  return res.rows;
}
