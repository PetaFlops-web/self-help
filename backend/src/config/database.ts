import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
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