import pool from '../config/database.js';
import type { UserRow, UserRole, UserProfile } from '../types/auth.js';

export async function findUserBySurel(surel: string): Promise<UserRow | null> {
  const res = await pool.query<UserRow>(
    `SELECT id, nama, surel, kata_sandi_hash, peran, aktif, dibuat_pada
       FROM pengguna
      WHERE surel = $1
      LIMIT 1`,
    [surel.toLowerCase().trim()],
  );
  return res.rows[0] || null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const res = await pool.query<UserRow>(
    `SELECT id, nama, surel, kata_sandi_hash, peran, aktif, dibuat_pada
       FROM pengguna
      WHERE id = $1
      LIMIT 1`,
    [id],
  );
  return res.rows[0] || null;
}

export async function createUser(data: {
  nama: string;
  surel: string;
  kata_sandi_hash: string;
  peran: UserRole;
  aktif?: boolean;
}): Promise<UserRow> {
  const res = await pool.query<UserRow>(
    `INSERT INTO pengguna (nama, surel, kata_sandi_hash, peran, aktif)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (surel) DO UPDATE
       SET nama = EXCLUDED.nama,
           kata_sandi_hash = EXCLUDED.kata_sandi_hash,
           peran = EXCLUDED.peran,
           aktif = EXCLUDED.aktif
     RETURNING id, nama, surel, kata_sandi_hash, peran, aktif, dibuat_pada`,
    [
      data.nama.trim(),
      data.surel.toLowerCase().trim(),
      data.kata_sandi_hash,
      data.peran,
      data.aktif ?? true,
    ],
  );
  return res.rows[0];
}

export function toUserProfile(user: UserRow): UserProfile {
  return {
    id: user.id,
    nama: user.nama,
    surel: user.surel,
    peran: user.peran,
    aktif: user.aktif,
    dibuat_pada: typeof user.dibuat_pada === 'string'
      ? user.dibuat_pada
      : user.dibuat_pada.toISOString(),
  };
}
