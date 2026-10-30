import pool from '../config/database.js';
import type { LlmTask, LlmOutput } from '../types/llm.js';

/**
 * Repository cache hasil LLM di tabel `penjelasan_llm` (Fase 10.1/10.2,
 * LLM-07). Masukan yang sama (ditandai `input_hash`) untuk `jenis` yang sama
 * memakai hasil tersimpan tanpa memanggil LLM Microservice lagi.
 */

export interface SaveExplanationInput {
  proyek_id: string;
  jenis: LlmTask;
  isi_json: LlmOutput;
  model: string | null;
  versi_prompt: string;
  input_hash: string;
}

/**
 * Ambil hasil LLM tersimpan paling baru yang cocok `input_hash` + `jenis`.
 * Mengembalikan `isi_json` bila ada, atau `null` bila cache miss.
 */
export async function findCachedExplanation(
  inputHash: string,
  jenis: LlmTask,
): Promise<LlmOutput | null> {
  const res = await pool.query<{ isi_json: LlmOutput }>(
    `SELECT isi_json
       FROM penjelasan_llm
      WHERE input_hash = $1 AND jenis = $2
      ORDER BY dibuat_pada DESC NULLS LAST
      LIMIT 1`,
    [inputHash, jenis],
  );
  return res.rows[0]?.isi_json ?? null;
}

/** Simpan hasil LLM yang lolos validasi ke `penjelasan_llm`. */
export async function saveExplanation(input: SaveExplanationInput): Promise<void> {
  await pool.query(
    `INSERT INTO penjelasan_llm
       (proyek_id, jenis, isi_json, model, versi_prompt, input_hash, dibuat_pada)
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [
      input.proyek_id,
      input.jenis,
      JSON.stringify(input.isi_json),
      input.model,
      input.versi_prompt,
      input.input_hash,
    ],
  );
}
