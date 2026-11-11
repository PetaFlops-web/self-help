import pool from '../config/database.js';
const PROJECT_COLUMNS = `
  p.id, p.kode_rup, p.kode_tender, p.nama, p.dinas, p.kode_bps,
  COALESCE(p.lat, w.lat) AS lat, COALESCE(p.lng, w.lng) AS lng, p.tahun_anggaran, p.sumber_dana, p.metode_pemilihan,
  p.pagu, p.hps, p.nilai_kontrak, p.status, p.pengumuman_rup_tgl,
  p.match_status, p.skor_total, p.kategori, p.is_dummy,
  p.source_id, p.source_url, p.fetched_at,
  p.asal_data,
  w.nama AS kabupaten,
  COALESCE(lw.total_laporan, 0)::int AS total_laporan,
  COALESCE(lw.laporan_menunggu, 0)::int AS laporan_menunggu,
  COALESCE(lw.laporan_selesai, 0)::int AS laporan_selesai
`;
const REPORT_AGGREGATE_JOIN = `
  LEFT JOIN (
    SELECT proyek_id,
           COUNT(*)::int AS total_laporan,
           COUNT(*) FILTER (WHERE status = 'Dilaporkan')::int AS laporan_menunggu,
           COUNT(*) FILTER (WHERE status = 'Selesai')::int AS laporan_selesai
      FROM laporan_warga
     WHERE proyek_id IS NOT NULL
     GROUP BY proyek_id
  ) lw ON lw.proyek_id = p.id
`;
function buildProjectWhereClause(f, includeTabFilters = true) {
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
    if (f.tahun_anggaran !== undefined) {
        params.push(f.tahun_anggaran);
        where.push(`p.tahun_anggaran = $${params.length}`);
    }
    if (f.asal_data) {
        if (f.asal_data === 'dummy') {
            where.push('p.is_dummy = TRUE');
        }
        else {
            params.push(f.asal_data);
            where.push(`(p.asal_data = $${params.length} AND COALESCE(p.is_dummy, FALSE) = FALSE)`);
        }
    }
    if (f.has_waiting_reports) {
        where.push('COALESCE(lw.laporan_menunggu, 0) > 0');
    }
    if (f.q) {
        params.push(`%${f.q}%`);
        const pIdx = params.length;
        where.push(`(p.nama ILIKE $${pIdx} OR p.dinas ILIKE $${pIdx} OR p.kode_rup ILIKE $${pIdx} OR p.kode_tender ILIKE $${pIdx})`);
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
    if (includeTabFilters) {
        if (f.kategori) {
            params.push(f.kategori);
            where.push(`p.kategori = $${params.length}`);
        }
        if (f.match_status) {
            if (f.match_status === 'unmatched') {
                where.push(`(p.match_status = 'unmatched' OR p.match_status IS NULL)`);
            }
            else {
                params.push(f.match_status);
                where.push(`p.match_status = $${params.length}`);
            }
        }
    }
    return {
        whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
        params,
    };
}
export async function listProjects(f) {
    const { whereSql, params } = buildProjectWhereClause(f, true);
    const limit = f.limit && f.limit > 0 ? Math.min(f.limit, 200) : 100;
    const offset = f.offset && f.offset >= 0 ? f.offset : 0;
    params.push(limit, offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;
    const sql = `
    SELECT ${PROJECT_COLUMNS}
      FROM proyek p
      LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
      ${REPORT_AGGREGATE_JOIN}
    ${whereSql}
     ORDER BY p.skor_total DESC NULLS LAST, p.nama
     LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
    const res = await pool.query(sql, params);
    return res.rows;
}
export async function listProjectsPaginated(f) {
    const limit = f.limit && f.limit > 0 ? Math.min(f.limit, 200) : 100;
    const offset = f.offset && f.offset >= 0 ? f.offset : 0;
    const fullFilter = buildProjectWhereClause(f, true);
    const baseFilter = buildProjectWhereClause(f, false);
    const hasTabFilters = Boolean(f.kategori || f.match_status);
    const rowParams = [...fullFilter.params, limit, offset];
    const limitIdx = rowParams.length - 1;
    const offsetIdx = rowParams.length;
    const rowsSql = `
    SELECT ${PROJECT_COLUMNS}
      FROM proyek p
      LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
      ${REPORT_AGGREGATE_JOIN}
    ${fullFilter.whereSql}
     ORDER BY p.skor_total DESC NULLS LAST, p.nama
     LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
    const waitingJoin = f.has_waiting_reports ? REPORT_AGGREGATE_JOIN : '';
    const kpiSql = `
    SELECT COUNT(*)::int AS total_proyek,
           COALESCE(SUM(COALESCE(p.pagu::numeric, 0)), 0)::float8 AS total_pagu,
           COUNT(*) FILTER (WHERE p.kategori = 'Tinggi')::int AS tinggi,
           COUNT(*) FILTER (WHERE p.kategori = 'Perlu Perhatian')::int AS perlu_perhatian,
           COUNT(*) FILTER (WHERE p.kategori = 'Rendah')::int AS rendah,
           COUNT(*) FILTER (WHERE p.match_status = 'unmatched' OR p.match_status IS NULL)::int AS unmatched
      FROM proyek p
      ${waitingJoin}
    ${baseFilter.whereSql}
  `;
    const countSql = `
    SELECT COUNT(*)::int AS total
      FROM proyek p
      ${waitingJoin}
    ${fullFilter.whereSql}
  `;
    const [rowsRes, kpiRes, countRes] = await Promise.all([
        pool.query(rowsSql, rowParams),
        pool.query(kpiSql, baseFilter.params),
        hasTabFilters
            ? pool.query(countSql, fullFilter.params)
            : Promise.resolve(null),
    ]);
    const kpi = kpiRes.rows[0] ?? {
        total_proyek: 0,
        total_pagu: 0,
        tinggi: 0,
        perlu_perhatian: 0,
        rendah: 0,
        unmatched: 0,
    };
    const total = countRes ? (countRes.rows[0]?.total ?? 0) : kpi.total_proyek;
    return {
        projects: rowsRes.rows,
        total,
        limit,
        offset,
        kpi,
    };
}
export async function getProjectById(id) {
    const res = await pool.query(`SELECT ${PROJECT_COLUMNS}
       FROM proyek p
       LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
       ${REPORT_AGGREGATE_JOIN}
      WHERE p.id = $1`, [id]);
    return res.rows[0] ?? null;
}
export async function listIndicatorFindingRows(projectId) {
    const res = await pool.query(`SELECT id, dimensi, kode_aturan, nilai_terukur, ambang, tingkat,
            bukti_ref, sumber, uraian_aturan, dihitung_pada
       FROM indikator_temuan
      WHERE proyek_id = $1
      ORDER BY dimensi, kode_aturan`, [projectId]);
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
