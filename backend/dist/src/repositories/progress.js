export async function getProgressById(client, id) {
    const res = await client.query(`SELECT id, proyek_id, tanggal, persen_fisik, sumber,
            source_id, source_url, fetched_at, is_dummy
       FROM progres
      WHERE id = $1`, [id]);
    return res.rows[0] ?? null;
}
export async function listProgressByProjectId(client, projectId) {
    const res = await client.query(`SELECT id, proyek_id, tanggal, persen_fisik, sumber,
            source_id, source_url, fetched_at, is_dummy
       FROM progres
      WHERE proyek_id = $1
      ORDER BY tanggal DESC NULLS LAST`, [projectId]);
    return res.rows;
}
export async function insertProgress(client, data) {
    const res = await client.query(`INSERT INTO progres (
        proyek_id, tanggal, persen_fisik, sumber, is_dummy
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, proyek_id, tanggal, persen_fisik, sumber,
                source_id, source_url, fetched_at, is_dummy`, [
        data.proyek_id,
        data.tanggal,
        data.persen_fisik,
        data.sumber ?? 'verifikator',
        data.is_dummy ?? false,
    ]);
    return res.rows[0];
}
export async function updateProgress(client, id, data) {
    const fields = [];
    const values = [];
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
    await client.query(`UPDATE progres SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return getProgressById(client, id);
}
export async function deleteProgress(client, id) {
    const res = await client.query('DELETE FROM progres WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
}
