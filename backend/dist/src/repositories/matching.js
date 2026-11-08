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
    const res = await pool.query(`SELECT candidate.id, candidate.kode_rup, candidate.kode_tender,
            candidate.nama, candidate.dinas, candidate.pagu, 0 AS skor
       FROM proyek candidate
       JOIN proyek source ON source.id = $1
      WHERE candidate.id <> $1
        AND (candidate.match_status = 'unmatched' OR candidate.match_status IS NULL)
        AND candidate.source_id IS NOT NULL
        AND source.source_id IS NOT NULL
        AND candidate.source_id <> source.source_id
        AND NOT EXISTS (
          SELECT 1
            FROM proyek_pencocokan pair
           WHERE pair.keputusan = 'not_match'
             AND (
               (pair.proyek_id = $1 AND pair.pasangan_id = candidate.id)
               OR (pair.pasangan_id = $1 AND pair.proyek_id = candidate.id)
             )
        )
      ORDER BY candidate.nama ASC`, [unmatchedId]);
    return res.rows;
}
export async function findAutoMatchCandidates(project, client) {
    const sql = `SELECT candidate.id, candidate.kode_tender, candidate.source_id, candidate.match_status
       FROM proyek candidate
      WHERE candidate.id <> $1
        AND candidate.kode_tender = $2
        AND candidate.source_id <> $3
        AND candidate.source_id IS NOT NULL
        AND (candidate.match_status = 'unmatched' OR candidate.match_status IS NULL)
        AND NOT EXISTS (
          SELECT 1
            FROM proyek_pencocokan pair
           WHERE pair.keputusan = 'not_match'
             AND (
               (pair.proyek_id = $1 AND pair.pasangan_id = candidate.id)
               OR (pair.pasangan_id = $1 AND pair.proyek_id = candidate.id)
             )
        )
      ORDER BY candidate.id ASC
      LIMIT 2`;
    const params = [project.id, project.kode_tender, project.source_id];
    const res = client
        ? await client.query(sql, params)
        : await pool.query(sql, params);
    return res.rows;
}
export async function lockProjectsForMatching(client, projectIds) {
    const res = await client.query(`SELECT id, kode_tender, source_id, match_status
       FROM proyek
      WHERE id = ANY($1::uuid[])
      ORDER BY id ASC
      FOR UPDATE`, [projectIds]);
    return res.rows;
}
export async function findPairDecision(client, proyekId, pasanganId) {
    const res = await client.query(`SELECT id, proyek_id, pasangan_id, keputusan
       FROM proyek_pencocokan
      WHERE proyek_id = $1 AND pasangan_id = $2`, [proyekId, pasanganId]);
    return res.rows[0] ?? null;
}
export async function insertPairDecision(client, proyekId, pasanganId, keputusan) {
    await client.query(`INSERT INTO proyek_pencocokan (proyek_id, pasangan_id, keputusan)
     VALUES ($1, $2, $3)`, [proyekId, pasanganId, keputusan]);
}
export async function markProjectsMatched(client, projectIds) {
    await client.query(`UPDATE proyek SET match_status = 'matched' WHERE id = ANY($1::uuid[])`, [projectIds]);
}
