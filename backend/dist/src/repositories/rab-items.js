export async function getRabItemById(client, id) {
    const res = await client.query(`SELECT ri.id, ri.proyek_id, ri.uraian, ri.satuan, ri.volume, ri.harga_satuan,
            ri.kode_harga_acuan,
            ha.harga AS harga_acuan,
            ha.uraian AS acuan_uraian,
            ha.satuan AS acuan_satuan,
            ri.source_id, ri.source_url, ri.fetched_at, ri.is_dummy
       FROM rab_item ri
       LEFT JOIN harga_acuan ha ON ha.kode = ri.kode_harga_acuan
      WHERE ri.id = $1`, [id]);
    return res.rows[0] ?? null;
}
export async function insertRabItem(client, data) {
    const res = await client.query(`INSERT INTO rab_item (
        proyek_id, uraian, satuan, volume, harga_satuan, kode_harga_acuan, is_dummy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, proyek_id, uraian, satuan, volume, harga_satuan, kode_harga_acuan,
                source_id, source_url, fetched_at, is_dummy`, [
        data.proyek_id,
        data.uraian,
        data.satuan,
        data.volume,
        data.harga_satuan,
        data.kode_harga_acuan ?? null,
        data.is_dummy ?? false,
    ]);
    const created = res.rows[0];
    const full = await getRabItemById(client, created.id);
    return full ?? created;
}
export async function updateRabItem(client, id, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    if (data.uraian !== undefined) {
        fields.push(`uraian = $${idx++}`);
        values.push(data.uraian);
    }
    if (data.satuan !== undefined) {
        fields.push(`satuan = $${idx++}`);
        values.push(data.satuan);
    }
    if (data.volume !== undefined) {
        fields.push(`volume = $${idx++}`);
        values.push(data.volume);
    }
    if (data.harga_satuan !== undefined) {
        fields.push(`harga_satuan = $${idx++}`);
        values.push(data.harga_satuan);
    }
    if (data.kode_harga_acuan !== undefined) {
        fields.push(`kode_harga_acuan = $${idx++}`);
        values.push(data.kode_harga_acuan);
    }
    if (fields.length === 0) {
        return getRabItemById(client, id);
    }
    values.push(id);
    await client.query(`UPDATE rab_item SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return getRabItemById(client, id);
}
export async function deleteRabItem(client, id) {
    const res = await client.query('DELETE FROM rab_item WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
}
