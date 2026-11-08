import pool from '../config/database.js';
import type { UnmatchedProject, MatchCandidate } from '../types/matching.js';

export async function listUnmatchedProjects(
  limit: number,
  offset: number,
): Promise<{ rows: UnmatchedProject[]; total: number }> {
  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM proyek WHERE match_status = 'unmatched' OR match_status IS NULL`,
  );
  const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

  const dataRes = await pool.query<UnmatchedProject>(
    `SELECT id, kode_rup, kode_tender, nama, dinas, pagu, tahun_anggaran
       FROM proyek
      WHERE match_status = 'unmatched' OR match_status IS NULL
      ORDER BY nama ASC
      LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return { rows: dataRes.rows, total };
}

export async function findMatchCandidates(unmatchedId: string): Promise<MatchCandidate[]> {
  const res = await pool.query<{
    id: string;
    kode_rup: string | null;
    kode_tender: string | null;
    nama: string;
    dinas: string | null;
    pagu: string | null;
  }>(
    `SELECT id, kode_rup, kode_tender, nama, dinas, pagu
       FROM proyek
      WHERE id <> $1
      ORDER BY nama ASC`,
    [unmatchedId],
  );

  return res.rows.map((row) => ({ ...row, skor: 0 }));
}

export async function getProjectForMatching(id: string): Promise<UnmatchedProject | null> {
  const res = await pool.query<UnmatchedProject>(
    `SELECT id, kode_rup, kode_tender, nama, dinas, pagu, tahun_anggaran
       FROM proyek
      WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function updateMatchStatus(
  projectId: string,
  status: string,
  matchedWithId?: string,
): Promise<void> {
  await pool.query(`UPDATE proyek SET match_status = $2 WHERE id = $1`, [projectId, status]);
  if (matchedWithId) {
    await pool.query(`UPDATE proyek SET match_status = 'matched' WHERE id = $1`, [matchedWithId]);
  }
}

export async function listAllProjectsForScoring(): Promise<
  Array<{
    id: string;
    kode_rup: string | null;
    kode_tender: string | null;
    nama: string;
    dinas: string | null;
    nilai_kontrak: string | null;
    pagu: string | null;
  }>
> {
  const res = await pool.query<{
    id: string;
    kode_rup: string | null;
    kode_tender: string | null;
    nama: string;
    dinas: string | null;
    nilai_kontrak: string | null;
    pagu: string | null;
  }>(
    `SELECT id, kode_rup, kode_tender, nama, dinas, nilai_kontrak, pagu
       FROM proyek
      ORDER BY nama ASC`,
  );
  return res.rows;
}
