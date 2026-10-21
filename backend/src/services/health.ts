import { checkDatabaseConnection } from '../config/database.js';
import redisClient from '../config/redis.js';
import { HttpError } from '../helpers/http.js';

export interface HealthResult {
  database_time: string;
  redis_status: string | null;
}

export async function checkHealth(): Promise<HealthResult> {
  let databaseTime: string;
  try {
    databaseTime = await checkDatabaseConnection();
  } catch (error) {
    console.error('Database connection error:', error);
    throw new HttpError(500, 'Internal Server Error: Gagal terhubung ke database');
  }

  await redisClient.set('ping_status', 'Redis is Active!', { EX: 10 });
  const redisStatus = await redisClient.get('ping_status');

  return { database_time: databaseTime, redis_status: redisStatus };
}
