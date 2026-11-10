import pool from '../config/database.js';
export async function listVerifiedReportsByProjectId(projectId) {
    const res = await pool.query(`SELECT tiket, kategori, keterangan
       FROM laporan_warga
      WHERE proyek_id = $1 AND status = 'Diverifikasi'
      ORDER BY tiket
      LIMIT 20`, [projectId]);
    return res.rows.map((r) => ({
        tiket: r.tiket,
        kategori: r.kategori,
        ringkasan: wrapReporterData(r.keterangan),
    }));
}
export async function listReportsByProjectId(projectId, limit = 20) {
    const res = await pool.query(`SELECT tiket, kategori, status, dibuat_pada, foto_urls, keterangan, anonim
       FROM laporan_warga
      WHERE proyek_id = $1
      ORDER BY dibuat_pada DESC
      LIMIT $2`, [projectId, limit]);
    return res.rows;
}
export async function listPublicReportsByProjectId(projectId, status, limit = 100) {
    const params = [projectId];
    let where = 'proyek_id = $1';
    if (status) {
        params.push(status);
        where += ` AND status = $${params.length}`;
    }
    params.push(limit);
    const res = await pool.query(`SELECT tiket, kategori, status, dibuat_pada, foto_urls, keterangan, anonim
       FROM laporan_warga
      WHERE ${where}
      ORDER BY dibuat_pada DESC
      LIMIT $${params.length}`, params);
    return res.rows;
}
export async function countReportsByProjectId(projectId) {
    const res = await pool.query(`SELECT COUNT(*)::int AS count
       FROM laporan_warga
      WHERE proyek_id = $1`, [projectId]);
    return res.rows[0]?.count ?? 0;
}
function wrapReporterData(keterangan) {
    if (!keterangan)
        return null;
    const cleaned = keterangan
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
    return cleaned.length > 0 ? `<data_pelapor>${cleaned}</data_pelapor>` : null;
}
function toPublicView(row, projectDetail) {
    const showKeterangan = row.status === 'Diverifikasi' || row.status === 'Ditolak';
    return {
        tiket: row.tiket,
        proyek_id: row.proyek_id,
        kategori: row.kategori,
        status: row.status,
        keterangan: showKeterangan ? row.keterangan : null,
        catatan_verifikator: row.catatan_verifikator,
        alasan_tolak: row.alasan_tolak,
        foto_urls: row.foto_urls,
        anonim: row.anonim,
        lat: row.lat,
        lng: row.lng,
        lembaga_tujuan: row.lembaga_tujuan ?? null,
        diteruskan_pada: row.diteruskan_pada ?? null,
        dibuat_pada: row.dibuat_pada,
        diubah_pada: row.diubah_pada,
        proyek: projectDetail ?? null,
    };
}
export async function getProjectDetailForReport(projectId) {
    if (!projectId)
        return null;
    const res = await pool.query(`SELECT p.nama,
            w.nama AS kabupaten
       FROM proyek p
       LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
      WHERE p.id = $1`, [projectId]);
    return res.rows[0] ?? null;
}
function generateTiket() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `LPR-${ts}-${rand}`;
}
export async function createReport(input) {
    const tiket = generateTiket();
    const res = await pool.query(`INSERT INTO laporan_warga
       (tiket, proyek_id, kategori, keterangan, lat, lng, foto_urls, anonim, ukuran_lapangan,
        nama_pelapor, surel_pelapor, telepon_pelapor, status, dibuat_pada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Dilaporkan', now())
     RETURNING *`, [
        tiket,
        input.proyek_id,
        input.kategori,
        input.keterangan,
        input.lat ?? null,
        input.lng ?? null,
        input.foto_urls ?? null,
        input.anonim ?? false,
        input.ukuran_lapangan ?? null,
        input.nama_pelapor ?? null,
        input.surel_pelapor ?? null,
        input.telepon_pelapor ?? null,
    ]);
    const projectDetail = await getProjectDetailForReport(input.proyek_id);
    return toPublicView(res.rows[0], projectDetail);
}
export async function getReportByTiket(tiket) {
    const res = await pool.query(`SELECT tiket, proyek_id, kategori, keterangan, lat, lng, foto_urls, anonim,
            status, alasan_tolak, catatan_verifikator, lembaga_tujuan, diteruskan_pada,
            dibuat_pada, diubah_pada
       FROM laporan_warga
      WHERE tiket = $1`, [tiket]);
    if (!res.rows[0])
        return null;
    const projectDetail = await getProjectDetailForReport(res.rows[0].proyek_id);
    return toPublicView(res.rows[0], projectDetail);
}
export async function getReportInternal(tiket) {
    const res = await pool.query(`SELECT tiket, proyek_id, kategori, keterangan, lat, lng, foto_urls, anonim,
            status, alasan_tolak, catatan_verifikator, lembaga_tujuan, diteruskan_pada,
            dibuat_pada, diubah_pada
       FROM laporan_warga
      WHERE tiket = $1`, [tiket]);
    return res.rows[0] ?? null;
}
export async function verifyReport(tiket, input) {
    const res = await pool.query(`UPDATE laporan_warga
        SET status = $2,
            catatan_verifikator = COALESCE($3, catatan_verifikator),
            alasan_tolak = COALESCE($4, alasan_tolak),
            diubah_pada = now()
      WHERE tiket = $1
     RETURNING *`, [tiket, input.status, input.catatan_verifikator ?? null, input.alasan_tolak ?? null]);
    if (!res.rows[0])
        return null;
    const projectDetail = await getProjectDetailForReport(res.rows[0].proyek_id);
    return toPublicView(res.rows[0], projectDetail);
}
export async function listRecapReports(filters) {
    const conditions = [`lw.status != 'Dilaporkan'`];
    const params = [];
    if (filters.start_date) {
        params.push(filters.start_date);
        conditions.push(`lw.dibuat_pada >= $${params.length}::date`);
    }
    if (filters.end_date) {
        params.push(filters.end_date);
        conditions.push(`lw.dibuat_pada <= $${params.length}::date`);
    }
    if (filters.status) {
        params.push(filters.status);
        conditions.push(`lw.status = $${params.length}`);
    }
    if (filters.kode_bps) {
        params.push(filters.kode_bps);
        conditions.push(`p.kode_bps = $${params.length}`);
    }
    const res = await pool.query(`SELECT lw.tiket, lw.kategori, lw.status, lw.keterangan,
            lw.catatan_verifikator, lw.alasan_tolak,
            lw.dibuat_pada, lw.diubah_pada,
            p.nama AS proyek_nama,
            w.nama AS proyek_kabupaten,
            p.kode_bps AS proyek_kode_bps,
            p.is_dummy AS proyek_is_dummy
       FROM laporan_warga lw
       LEFT JOIN proyek p ON p.id = lw.proyek_id
       LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
      WHERE ${conditions.join(' AND ')}
      ORDER BY lw.dibuat_pada ASC`, params);
    return res.rows;
}
export async function listAdminReports(filters) {
    const conditions = [];
    const params = [];
    if (filters.status) {
        params.push(filters.status);
        conditions.push(`lw.status = $${params.length}`);
    }
    if (filters.kategori) {
        params.push(filters.kategori);
        conditions.push(`lw.kategori = $${params.length}`);
    }
    if (filters.kode_bps) {
        params.push(filters.kode_bps);
        conditions.push(`p.kode_bps = $${params.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) AS count
       FROM laporan_warga lw
       LEFT JOIN proyek p ON p.id = lw.proyek_id
       ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);
    params.push(filters.limit);
    params.push(filters.offset);
    const dataRes = await pool.query(`SELECT lw.tiket, lw.kategori, lw.status, lw.dibuat_pada,
            p.nama AS proyek_nama,
            w.nama AS proyek_kabupaten,
            p.kode_bps AS proyek_kode_bps
       FROM laporan_warga lw
       LEFT JOIN proyek p ON p.id = lw.proyek_id
       LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
       ${whereClause}
      ORDER BY lw.dibuat_pada ASC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}`, params);
    const rows = dataRes.rows.map((r) => ({
        tiket: r.tiket,
        kategori: r.kategori,
        status: r.status,
        dibuat_pada: r.dibuat_pada,
        proyek: r.proyek_nama
            ? {
                nama: r.proyek_nama,
                kabupaten: r.proyek_kabupaten,
                kode_bps: r.proyek_kode_bps,
            }
            : null,
    }));
    return { rows, total };
}
export async function countReportsByStatus() {
    const res = await pool.query(`SELECT status, COUNT(*)::int AS count
       FROM laporan_warga
      GROUP BY status`);
    const map = {};
    for (const row of res.rows) {
        map[row.status] = row.count;
    }
    return map;
}
export async function getAdminReportDetail(tiket) {
    const res = await pool.query(`SELECT lw.tiket, lw.proyek_id, lw.kategori, lw.keterangan, lw.lat, lw.lng,
            lw.foto_urls, lw.anonim, lw.status, lw.alasan_tolak, lw.catatan_verifikator,
            lw.lembaga_tujuan, lw.diteruskan_pada, lw.dibuat_pada, lw.diubah_pada,
            p.nama AS proyek_nama,
            w.nama AS proyek_kabupaten,
            p.kode_bps AS proyek_kode_bps
       FROM laporan_warga lw
       LEFT JOIN proyek p ON p.id = lw.proyek_id
       LEFT JOIN wilayah w ON w.kode_bps = p.kode_bps
      WHERE lw.tiket = $1`, [tiket]);
    if (!res.rows[0])
        return null;
    const r = res.rows[0];
    return {
        tiket: r.tiket,
        proyek_id: r.proyek_id,
        kategori: r.kategori,
        keterangan: r.keterangan,
        lat: r.lat,
        lng: r.lng,
        foto_urls: r.foto_urls,
        anonim: r.anonim,
        status: r.status,
        alasan_tolak: r.alasan_tolak,
        catatan_verifikator: r.catatan_verifikator,
        lembaga_tujuan: r.lembaga_tujuan,
        diteruskan_pada: r.diteruskan_pada,
        dibuat_pada: r.dibuat_pada,
        diubah_pada: r.diubah_pada,
        proyek: r.proyek_nama
            ? {
                nama: r.proyek_nama,
                kabupaten: r.proyek_kabupaten,
                kode_bps: r.proyek_kode_bps,
            }
            : null,
    };
}
export async function forwardReport(tiket, lembaga) {
    const res = await pool.query(`UPDATE laporan_warga
        SET status = 'Diteruskan',
            lembaga_tujuan = $2,
            diteruskan_pada = now(),
            diubah_pada = now()
      WHERE tiket = $1
     RETURNING *`, [tiket, lembaga]);
    if (!res.rows[0])
        return null;
    const projectDetail = await getProjectDetailForReport(res.rows[0].proyek_id);
    return toPublicView(res.rows[0], projectDetail);
}
export async function getDailyReportTrend(days = 14) {
    const safeDays = Math.max(1, Math.min(days, 90));
    const res = await pool.query(`WITH dates AS (
       SELECT generate_series(
         CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day',
         CURRENT_DATE,
         INTERVAL '1 day'
       )::date AS tgl
     )
     SELECT 
       to_char(d.tgl, 'YYYY-MM-DD') AS tanggal,
       COUNT(lw.tiket)::int AS total_masuk,
       COUNT(lw.tiket) FILTER (WHERE lw.status = 'Diverifikasi')::int AS diverifikasi,
       COUNT(lw.tiket) FILTER (WHERE lw.status = 'Selesai')::int AS selesai,
       COUNT(lw.tiket) FILTER (WHERE lw.status = 'Ditolak')::int AS ditolak
     FROM dates d
     LEFT JOIN laporan_warga lw ON date(lw.dibuat_pada) = d.tgl
     GROUP BY d.tgl
     ORDER BY d.tgl ASC`, [safeDays]);
    return res.rows;
}
