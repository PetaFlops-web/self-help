import pool from '../config/database.js';
export async function findCachedExplanation(inputHash, jenis) {
    const res = await pool.query(`SELECT isi_json, dibuat_pada
       FROM penjelasan_llm
      WHERE input_hash = $1 AND jenis = $2
      ORDER BY dibuat_pada DESC NULLS LAST
      LIMIT 1`, [inputHash, jenis]);
    if (!res.rows[0])
        return null;
    return {
        isi_json: res.rows[0].isi_json,
        dibuat_pada: res.rows[0].dibuat_pada,
    };
}
export async function saveExplanation(input) {
    await pool.query(`INSERT INTO penjelasan_llm
       (proyek_id, jenis, isi_json, model, versi_prompt, input_hash, dibuat_pada)
     VALUES ($1, $2, $3, $4, $5, $6, now())`, [
        input.proyek_id,
        input.jenis,
        JSON.stringify(input.isi_json),
        input.model,
        input.versi_prompt,
        input.input_hash,
    ]);
}
