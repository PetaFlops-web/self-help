import type { Pool, PoolClient } from 'pg';
import pool from '../config/database.js';
import type { Payment, Progress, RabItem } from '../types/financials.js';

export type DbClient = Pool | PoolClient;

export interface InsertPaymentData {
  proyek_id: string;
  termin_ke: number;
  tanggal: string;
  jumlah: number;
  persen_kontrak: number;
  is_dummy?: boolean;
}

export interface UpdatePaymentData {
  termin_ke?: number;
  tanggal?: string;
  jumlah?: number;
  persen_kontrak?: number;
}

export async function getPaymentsByProjectId(projectId: string): Promise<Payment[]> {
  const res = await pool.query<Payment>(
    `SELECT id, proyek_id, termin_ke, tanggal, jumlah, persen_kontrak,
            source_id, source_url, fetched_at, is_dummy
       FROM pembayaran
      WHERE proyek_id = $1
      ORDER BY termin_ke NULLS LAST, tanggal NULLS LAST`,
    [projectId],
  );
  return res.rows;
}

export async function getPaymentById(client: DbClient, id: string): Promise<Payment | null> {
  const res = await client.query<Payment>(
    `SELECT id, proyek_id, termin_ke, tanggal, jumlah, persen_kontrak,
            source_id, source_url, fetched_at, is_dummy
       FROM pembayaran
      WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function insertPayment(client: DbClient, data: InsertPaymentData): Promise<Payment> {
  const res = await client.query<Payment>(
    `INSERT INTO pembayaran (
        proyek_id, termin_ke, tanggal, jumlah, persen_kontrak, is_dummy
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, proyek_id, termin_ke, tanggal, jumlah, persen_kontrak,
                source_id, source_url, fetched_at, is_dummy`,
    [
      data.proyek_id,
      data.termin_ke,
      data.tanggal,
      data.jumlah,
      data.persen_kontrak,
      data.is_dummy ?? false,
    ],
  );
  return res.rows[0];
}

export async function updatePayment(client: DbClient, id: string, data: UpdatePaymentData): Promise<Payment | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.termin_ke !== undefined) {
    fields.push(`termin_ke = $${idx++}`);
    values.push(data.termin_ke);
  }
  if (data.tanggal !== undefined) {
    fields.push(`tanggal = $${idx++}`);
    values.push(data.tanggal);
  }
  if (data.jumlah !== undefined) {
    fields.push(`jumlah = $${idx++}`);
    values.push(data.jumlah);
  }
  if (data.persen_kontrak !== undefined) {
    fields.push(`persen_kontrak = $${idx++}`);
    values.push(data.persen_kontrak);
  }

  if (fields.length === 0) {
    return getPaymentById(client, id);
  }

  values.push(id);
  await client.query(
    `UPDATE pembayaran SET ${fields.join(', ')} WHERE id = $${idx}`,
    values,
  );
  return getPaymentById(client, id);
}

export async function deletePayment(client: DbClient, id: string): Promise<boolean> {
  const res = await client.query('DELETE FROM pembayaran WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function getProgressByProjectId(projectId: string): Promise<Progress[]> {
  const res = await pool.query<Progress>(
    `SELECT id, proyek_id, tanggal, persen_fisik, sumber,
            source_id, source_url, fetched_at, is_dummy
       FROM progres
      WHERE proyek_id = $1
      ORDER BY tanggal DESC NULLS LAST`,
    [projectId],
  );
  return res.rows;
}

export async function getRabItemsByProjectId(projectId: string): Promise<RabItem[]> {
  const res = await pool.query<RabItem>(
    `SELECT ri.id, ri.proyek_id, ri.uraian, ri.satuan, ri.volume, ri.harga_satuan,
            ri.kode_harga_acuan,
            ha.harga AS harga_acuan,
            ha.uraian AS acuan_uraian,
            ha.satuan AS acuan_satuan,
            ri.source_id, ri.source_url, ri.fetched_at, ri.is_dummy
       FROM rab_item ri
       LEFT JOIN harga_acuan ha ON ha.kode = ri.kode_harga_acuan
      WHERE ri.proyek_id = $1
      ORDER BY ri.id`,
    [projectId],
  );
  return res.rows;
}
