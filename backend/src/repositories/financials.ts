import pool from '../config/database.js';
import type { Payment, Progress, RabItem } from '../types/financials.js';

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

