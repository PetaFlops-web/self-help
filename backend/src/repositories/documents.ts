import pool from '../config/database.js';
import type { Document, ProcedureChecklist } from '../types/documents.js';

export async function listDocumentsByProjectId(projectId: string): Promise<Document[]> {
  const res = await pool.query<Document>(
    `SELECT id, proyek_id, jenis, wajib, dipublikasikan, tanggal,
            source_id, source_url, fetched_at, is_dummy
       FROM dokumen
      WHERE proyek_id = $1
      ORDER BY tanggal NULLS LAST, jenis`,
    [projectId],
  );
  return res.rows;
}

export async function listProcedureChecklistsByProjectId(projectId: string): Promise<ProcedureChecklist[]> {
  const res = await pool.query<ProcedureChecklist>(
    `SELECT id, proyek_id, tahapan, terpenuhi,
            source_id, source_url, fetched_at, is_dummy
       FROM prosedur_checklist
      WHERE proyek_id = $1
      ORDER BY tahapan`,
    [projectId],
  );
  return res.rows;
}

export async function countDocumentSummary(projectId: string): Promise<{ total: number; wajib: number; belum_publik: number }> {
  const res = await pool.query<{ total: number; wajib: number; belum_publik: number }>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE wajib = true)::int AS wajib,
            COUNT(*) FILTER (WHERE wajib = true AND dipublikasikan = false)::int AS belum_publik
       FROM dokumen
      WHERE proyek_id = $1`,
    [projectId],
  );
  return res.rows[0];
}

export async function countProcedureSummary(projectId: string): Promise<{ total: number; terpenuhi: number; tidak_terpenuhi: number }> {
  const res = await pool.query<{ total: number; terpenuhi: number; tidak_terpenuhi: number }>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE terpenuhi = true)::int AS terpenuhi,
            COUNT(*) FILTER (WHERE terpenuhi = false)::int AS tidak_terpenuhi
       FROM prosedur_checklist
      WHERE proyek_id = $1`,
    [projectId],
  );
  return res.rows[0];
}
