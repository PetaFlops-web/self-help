import type { Pool, PoolClient } from 'pg';
import pool from '../config/database.js';
import type { Progress } from '../types/financials.js';

export type DbClient = Pool | PoolClient;

export interface InsertProgressData {
  proyek_id: string;
  tanggal: string;
  persen_fisik: number;
  sumber?: string;
  is_dummy?: boolean;
}

export interface UpdateProgressData {
  tanggal?: string;
  persen_fisik?: number;
}

export async function getProgressById(client: DbClient, id: string): Promise<Progress | null> {
  const res = await client.query<Progress>(
    `SELECT id, proyek_id, tanggal, persen_fisik, sumber,
            source_id, source_url, fetched_at, is_dummy
       FROM progres
      WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function listProgressByProjectId(client: DbClient, projectId: string): Promise<Progress[]> {
  const res = await client.query<Progress>(
    `SELECT id, proyek_id, tanggal, persen_fisik, sumber,
            source_id, source_url, fetched_at, is_dummy
       FROM progres
      WHERE proyek_id = $1
      ORDER BY tanggal DESC NULLS LAST`,
    [projectId],
  );
  return res.rows;
}

export async function insertProgress(client: DbClient, data: InsertProgressData): Promise<Progress> {
  const res = await client.query<Progress>(
    `INSERT INTO progres (
        proyek_id, tanggal, persen_fisik, sumber, is_dummy
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, proyek_id, tanggal, persen_fisik, sumber,
                source_id, source_url, fetched_at, is_dummy`,
    [
      data.proyek_id,
      data.tanggal,
      data.persen_fisik,
      data.sumber ?? 'verifikator',
      data.is_dummy ?? false,
    ],
  );
  return res.rows[0];
}

export async function updateProgress(client: DbClient, id: string, data: UpdateProgressData): Promise<Progress | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.tanggal !== undefined) {
    fields.push(`tanggal = $${idx++}`);
    values.push(data.tanggal);
  }
  if (data.persen_fisik !== undefined) {
    fields.push(`persen_fisik = $${idx++}`);
    values.push(data.persen_fisik);
  }

  if (fields.length === 0) {
    return getProgressById(client, id);
  }

  values.push(id);
  await client.query(
    `UPDATE progres SET ${fields.join(', ')} WHERE id = $${idx}`,
    values,
  );
  return getProgressById(client, id);
}

export async function deleteProgress(client: DbClient, id: string): Promise<boolean> {
  const res = await client.query('DELETE FROM progres WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}
