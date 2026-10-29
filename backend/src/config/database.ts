import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('connect', () => {
    console.log('Berhasil terhubung ke database PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Error tidak terduga pada database client', err);
    process.exit(-1);
});

export default pool;

export async function checkDatabaseConnection(): Promise<string> {
  const result = await pool.query<{ now: string }>('SELECT NOW()');
  return result.rows[0].now;
}