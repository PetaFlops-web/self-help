import pool from '../config/database.js';
import type { AuditEntry, AuditLogRow, AuditListResult } from '../types/audit.js';

export async function insertAuditLog(entry: AuditEntry): Promise<void> {
  await pool.query(
    `INSERT INTO log_audit (aktor_id, aktor_nama, peran, modul, aksi, target_id, diff, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.aktor_id,
      entry.aktor_nama,
      entry.peran,
      entry.modul,
      entry.aksi,
      entry.target_id,
      entry.diff ? JSON.stringify(entry.diff) : null,
      entry.ip,
    ],
  );
}

export async function listAuditLogs(filters: {
  modul?: string;
  aktor_id?: string;
  start_date?: string;
  end_date?: string;
  limit: number;
  offset: number;
}): Promise<AuditListResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.modul) {
    params.push(filters.modul);
    conditions.push(`modul = $${params.length}`);
  }
  if (filters.aktor_id) {
    params.push(filters.aktor_id);
    conditions.push(`aktor_id = $${params.length}`);
  }
  if (filters.start_date) {
    params.push(filters.start_date);
    conditions.push(`waktu >= $${params.length}::timestamptz`);
  }
  if (filters.end_date) {
    params.push(filters.end_date);
    conditions.push(`waktu <= $${params.length}::timestamptz`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM log_audit ${whereClause}`,
    params,
  );
  const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

  params.push(filters.limit);
  params.push(filters.offset);
  const dataRes = await pool.query<AuditLogRow>(
    `SELECT id, waktu, aktor_id, aktor_nama, peran, modul, aksi, target_id, diff, ip
       FROM log_audit
       ${whereClause}
      ORDER BY waktu DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}`,
    params,
  );

  return { rows: dataRes.rows, total };
}
