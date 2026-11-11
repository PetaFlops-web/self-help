import dotenv from 'dotenv';
dotenv.config();
const nodeEnv = process.env.NODE_ENV || 'development';
export const isDev = nodeEnv === 'development';
export const isProd = nodeEnv === 'production';
const DEV_ENCRYPTION_PLACEHOLDER = 'clearsight-dev-encryption-key-replace-in-prod-0123456789';
const DEV_JWT_FALLBACK = 'clearsight-dev-jwt-secret-replace-in-production-1234567890';
const required = isProd
    ? ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'ENCRYPTION_KEY']
    : ['DATABASE_URL', 'REDIS_URL', 'ENCRYPTION_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
    throw new Error(`[env] Variabel environment wajib tidak ditemukan: ${missing.join(', ')}. ` +
        `Salin .env.example ke .env dan isi nilainya.`);
}
export const config = {
    nodeEnv,
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    databaseUrl: process.env.DATABASE_URL,
    databaseSsl: process.env.DATABASE_SSL === 'true',
    redisUrl: process.env.REDIS_URL,
    llmServiceUrl: (process.env.LLM_SERVICE_URL || 'http://localhost:3001').replace(/\/+$/, ''),
    llmServiceTimeoutMs: Number(process.env.LLM_SERVICE_TIMEOUT_MS) || 30000,
    allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
        : [],
    jwtSecret: isProd
        ? process.env.JWT_SECRET
        : (process.env.JWT_SECRET || DEV_JWT_FALLBACK),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    encryptionKey: process.env.ENCRYPTION_KEY,
    smtp: {
        host: process.env.SMTP_HOST || null,
        port: Number(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER || null,
        pass: process.env.SMTP_PASS || null,
        from: process.env.MAIL_FROM || null,
    },
    appBaseUrl: (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/+$/, ''),
};
const JWT_EXPIRES_IN_RE = /^\d+(ms|s|m|h|d|w)$/;
if (!JWT_EXPIRES_IN_RE.test(config.jwtExpiresIn)) {
    throw new Error(`[env] JWT_EXPIRES_IN tidak valid: "${config.jwtExpiresIn}". ` +
        `Gunakan format seperti "24h", "7d", "3600s".`);
}
if (isProd && (config.encryptionKey.length < 32 || config.encryptionKey === DEV_ENCRYPTION_PLACEHOLDER)) {
    throw new Error('[env] ENCRYPTION_KEY wajib diisi rahasia unik minimal 32 karakter (bukan nilai dev) di production.');
}
export default config;
