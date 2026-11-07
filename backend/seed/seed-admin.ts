import '../src/config/env.js';
import pool from '../src/config/database.js';
import { hashPassword } from '../src/helpers/password.js';
import { createUser } from '../src/repositories/user.js';

async function run(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAMA || 'Administrator';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD wajib diatur di file environment (.env)');
  }

  const hash = await hashPassword(password);
  const user = await createUser({
    nama: name,
    surel: email,
    kata_sandi_hash: hash,
    peran: 'admin',
    aktif: true,
  });

  console.log(`Akun admin awal berhasil disiapkan: ${user.surel} (${user.id})`);
}

run()
  .catch((err) => {
    console.error('Gagal menyiapkan akun admin:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
