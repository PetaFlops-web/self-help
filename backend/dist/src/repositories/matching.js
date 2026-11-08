import pool from '../config/database.js';
export async function listUnmatchedProjects(limit, offset) {
    const countRes = await pool.query(`SELECT COUNT(*) AS count FROM proyek WHERE match_status = 'unmatched' OR match_status IS NULL`);
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);
    const dataRes = await pool.query(`SELECT id, kode_rup, kode_tender, nama, dinas, pagu, tahun_anggaran
       FROM proyek
      WHERE match_status = 'unmatched' OR match_status IS NULL
      ORDER BY nama ASC
      LIMIT $1 OFFSET $2`, [limit, offset]);
    return { rows: dataRes.rows, total };
}
export async function findMatchCandidates(unmatchedId) {
    const res = await pool.query(`SELECT id, kode_rup, kode_tender, nama, dinas, pagu
       FROM proyek
      WHERE id <> $1
      ORDER BY nama ASC`, [unmatchedId]);
    return res.rows.map((row) => ({ ...row, skor: 0 }));
}
export async function getProjectForMatching(id) {
    const res = await pool.query(`SELECT id, kode_rup, kode_tender, nama, dinas, pagu, tahun_anggaran
       FROM proyek
      WHERE id = $1`, [id]);
    return res.rows[0] ?? null;
}
export async function updateMatchStatus(projectId, status, matchedWithId) {
    await pool.query(`UPDATE proyek SET match_status = $2 WHERE id = $1`, [projectId, status]);
    if (matchedWithId) {
        await pool.query(`UPDATE proyek SET match_status = 'matched' WHERE id = $1`, [matchedWithId]);
    }
}
export async function listAllProjectsForScoring() {
    const res = await pool.query(`SELECT id, kode_rup, kode_tender, nama, dinas, nilai_kontrak, pagu
       FROM proyek
      ORDER BY nama ASC`);
    return res.rows;
}
