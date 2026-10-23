import pool from '../config/database.js';
export async function listDocumentsByProjectId(projectId) {
    const res = await pool.query(`SELECT id, proyek_id, jenis, wajib, dipublikasikan, tanggal,
            source_id, source_url, fetched_at, is_dummy
       FROM dokumen
      WHERE proyek_id = $1
      ORDER BY tanggal NULLS LAST, jenis`, [projectId]);
    return res.rows;
}
export async function listProcedureChecklistsByProjectId(projectId) {
    const res = await pool.query(`SELECT id, proyek_id, tahapan, terpenuhi,
            source_id, source_url, fetched_at, is_dummy
       FROM prosedur_checklist
      WHERE proyek_id = $1
      ORDER BY tahapan`, [projectId]);
    return res.rows;
}
export async function countDocumentSummary(projectId) {
    const res = await pool.query(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE wajib = true)::int AS wajib,
            COUNT(*) FILTER (WHERE wajib = true AND dipublikasikan = false)::int AS belum_publik
       FROM dokumen
      WHERE proyek_id = $1`, [projectId]);
    return res.rows[0];
}
export async function countProcedureSummary(projectId) {
    const res = await pool.query(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE terpenuhi = true)::int AS terpenuhi,
            COUNT(*) FILTER (WHERE terpenuhi = false)::int AS tidak_terpenuhi
       FROM prosedur_checklist
      WHERE proyek_id = $1`, [projectId]);
    return res.rows[0];
}
