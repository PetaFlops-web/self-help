import pool from '../config/database.js';
/**
 * Ambil hasil LLM tersimpan paling baru yang cocok `input_hash` + `jenis`.
 * Mengembalikan `isi_json` bila ada, atau `null` bila cache miss.
 */
export async function findCachedExplanation(inputHash, jenis) {
    const res = await pool.query(`SELECT isi_json
       FROM penjelasan_llm
      WHERE input_hash = $1 AND jenis = $2
      ORDER BY dibuat_pada DESC NULLS LAST
      LIMIT 1`, [inputHash, jenis]);
    return res.rows[0]?.isi_json ?? null;
}
/** Simpan hasil LLM yang lolos validasi ke `penjelasan_llm`. */
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
