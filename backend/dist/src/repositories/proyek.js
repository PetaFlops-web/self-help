import pool from '../config/database.js';
const PROYEK_COLS = `
  p.id, p.kode_rup, p.kode_tender, p.nama, p.dinas, p.kode_bps,
  COALESCE(p.lat, w.lat) AS lat, COALESCE(p.lng, w.lng) AS lng, p.tahun_anggaran, p.sumber_dana, p.metode_pemilihan,
  p.pagu, p.hps, p.nilai_kontrak, p.status, p.pengumuman_rup_tgl,
  p.match_status, p.skor_total, p.kategori, p.is_dummy,
  p.source_id, p.source_url, p.fetched_at,
  w.nama AS kabupaten
`;
export async function listProyek(f) {
    const where = [];
    const params = [];
    if (f.kode_bps) {
        params.push(f.kode_bps);
        where.push(`p.kode_bps = $${params.length}`);
    }
    if (f.dinas) {
        params.push(f.dinas);
        where.push(`p.dinas = $${params.length}`);
    }
    if (f.kategori) {
        params.push(f.kategori);
        where.push(`p.kategori = $${params.length}`);
    }
    if (f.tahun_anggaran !== undefined) {
        params.push(f.tahun_anggaran);
        where.push(`p.tahun_anggaran = $${params.length}`);
    }
    if (f.q) {
        params.push(`%${f.q}%`);
        where.push(`(p.nama ILIKE $${params.length} OR p.dinas ILIKE $${params.length})`);
    }
    if (f.pagu_min !== undefined) {
        params.push(f.pagu_min);
        where.push(`p.pagu IS NOT NULL AND p.pagu::numeric >= $${params.length}`);
    }
    if (f.pagu_max !== undefined) {
        params.push(f.pagu_max);
        where.push(`p.pagu IS NOT NULL AND p.pagu::numeric <= $${params.length}`);
    }
    if (f.nilai_kontrak_min !== undefined) {
        params.push(f.nilai_kontrak_min);
        where.push(`p.nilai_kontrak IS NOT NULL AND p.nilai_kontrak::numeric >= $${params.length}`);
    }
    if (f.nilai_kontrak_max !== undefined) {
        params.push(f.nilai_kontrak_max);
        where.push(`p.nilai_kontrak IS NOT NULL AND p.nilai_kontrak::numeric <= $${params.length}`);
    }
    const limit = f.limit && f.limit > 0 ? Math.min(f.limit, 200) : 100;
    params.push(limit);
    const sql = `
    SELECT ${PROYEK_COLS}
      FROM proyek p
      LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.skor_total DESC NULLS LAST, p.nama
     LIMIT $${params.length}
  `;
    const res = await pool.query(sql, params);
    return res.rows;
}
export async function getProyekById(id) {
    const res = await pool.query(`SELECT ${PROYEK_COLS}
       FROM proyek p
       LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
      WHERE p.id = $1`, [id]);
    return res.rows[0] ?? null;
}
export async function listIndikatorTemuan(proyekId) {
    const res = await pool.query(`SELECT id, dimensi, kode_aturan, nilai_terukur, ambang, tingkat,
            bukti_ref, sumber, uraian_aturan, dihitung_pada
       FROM indikator_temuan
      WHERE proyek_id = $1
      ORDER BY dimensi, kode_aturan`, [proyekId]);
    return res.rows;
}
export async function getStats() {
    const res = await pool.query(`SELECT COUNT(*)::int AS total_proyek,
            COUNT(*) FILTER (WHERE kategori = 'Rendah')::int AS rendah,
            COUNT(*) FILTER (WHERE kategori = 'Perlu Perhatian')::int AS perlu_perhatian,
            COUNT(*) FILTER (WHERE kategori = 'Tinggi')::int AS tinggi,
            ROUND(AVG(skor_total), 2)::float8 AS rata_rata_skor
       FROM proyek`);
    return res.rows[0];
}
