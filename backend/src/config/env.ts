import dotenv from 'dotenv';

dotenv.config();

const nodeEnv: string = process.env.NODE_ENV || 'development';

export const isDev: boolean = nodeEnv === 'development';
export const isProd: boolean = nodeEnv === 'production';

const required: string[] = ['DATABASE_URL', 'REDIS_URL'];
const missing: string[] = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `[env] Variabel environment wajib tidak ditemukan: ${missing.join(', ')}. ` +
    `Salin .env.example ke .env dan isi nilainya.`
  );
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  databaseUrl: string;
  databaseSsl: boolean;
  redisUrl: string;
  llmServiceUrl: string;
  llmServiceTimeoutMs: number;
  allowedOrigins: string[];
}

export const config: AppConfig = {
  nodeEnv,
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL!,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  redisUrl: process.env.REDIS_URL!,
  llmServiceUrl: (process.env.LLM_SERVICE_URL || 'http://localhost:3001').replace(/\/+$/, ''),
  llmServiceTimeoutMs: Number(process.env.LLM_SERVICE_TIMEOUT_MS) || 30000,
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [],
};

export default config;
