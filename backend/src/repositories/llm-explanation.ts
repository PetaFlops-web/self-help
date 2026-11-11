import pool from '../config/database.js';
import type { LlmTask, LlmOutput } from '../types/llm.js';


export interface SaveExplanationInput {
  proyek_id: string;
  jenis: LlmTask;
  isi_json: LlmOutput;
  model: string | null;
  versi_prompt: string;
  input_hash: string;
}

export interface CachedExplanation {
  isi_json: LlmOutput;
  dibuat_pada: Date;
}

export async function findCachedExplanation(
  inputHash: string,
  jenis: LlmTask,
): Promise<CachedExplanation | null> {
  const res = await pool.query<{ isi_json: LlmOutput; dibuat_pada: Date }>(
    `SELECT isi_json, dibuat_pada
       FROM penjelasan_llm
      WHERE input_hash = $1 AND jenis = $2
      ORDER BY dibuat_pada DESC NULLS LAST
      LIMIT 1`,
    [inputHash, jenis],
  );
  if (!res.rows[0]) return null;
  return {
    isi_json: res.rows[0].isi_json,
    dibuat_pada: res.rows[0].dibuat_pada,
  };
}

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
