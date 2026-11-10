import pool from '../config/database.js';
export async function getPaymentsByProjectId(projectId) {
    const res = await pool.query(`SELECT id, proyek_id, termin_ke, tanggal, jumlah, persen_kontrak,
            source_id, source_url, fetched_at, is_dummy
       FROM pembayaran
      WHERE proyek_id = $1
      ORDER BY termin_ke NULLS LAST, tanggal NULLS LAST`, [projectId]);
    return res.rows;
}
export async function getPaymentById(client, id) {
    const res = await client.query(`SELECT id, proyek_id, termin_ke, tanggal, jumlah, persen_kontrak,
            source_id, source_url, fetched_at, is_dummy
       FROM pembayaran
      WHERE id = $1`, [id]);
    return res.rows[0] ?? null;
}
export async function insertPayment(client, data) {
    const res = await client.query(`INSERT INTO pembayaran (
        proyek_id, termin_ke, tanggal, jumlah, persen_kontrak, is_dummy
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, proyek_id, termin_ke, tanggal, jumlah, persen_kontrak,
                source_id, source_url, fetched_at, is_dummy`, [
        data.proyek_id,
        data.termin_ke,
        data.tanggal,
        data.jumlah,
        data.persen_kontrak,
        data.is_dummy ?? false,
    ]);
    return res.rows[0];
}
export async function updatePayment(client, id, data) {
    const fields = [];
    const values = [];
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
    await client.query(`UPDATE pembayaran SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return getPaymentById(client, id);
}
export async function deletePayment(client, id) {
    const res = await client.query('DELETE FROM pembayaran WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
}
export async function getProgressByProjectId(projectId) {
    const res = await pool.query(`SELECT id, proyek_id, tanggal, persen_fisik, sumber,
            source_id, source_url, fetched_at, is_dummy
       FROM progres
      WHERE proyek_id = $1
      ORDER BY tanggal DESC NULLS LAST`, [projectId]);
    return res.rows;
}
export async function getRabItemsByProjectId(projectId) {
    const res = await pool.query(`SELECT ri.id, ri.proyek_id, ri.uraian, ri.satuan, ri.volume, ri.harga_satuan,
            ri.kode_harga_acuan,
            ha.harga AS harga_acuan,
            ha.uraian AS acuan_uraian,
            ha.satuan AS acuan_satuan,
            ri.source_id, ri.source_url, ri.fetched_at, ri.is_dummy
       FROM rab_item ri
       LEFT JOIN harga_acuan ha ON ha.kode = ri.kode_harga_acuan
      WHERE ri.proyek_id = $1
      ORDER BY ri.id`, [projectId]);
    return res.rows;
}
