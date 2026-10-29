import rateLimit from 'express-rate-limit';
import { isProd } from '../config/env.js';
export const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: isProd ? 100 : 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { status: 'error', message: 'Terlalu banyak request, coba lagi nanti' },
    keyGenerator: (req) => req.headers['x-real-ip'] || req.ip || 'unknown',
});
export const llmLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: isProd ? 5 : 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { status: 'error', message: 'Batas permintaan LLM tercapai, coba lagi dalam 1 menit' },
    keyGenerator: (req) => req.headers['x-real-ip'] || req.ip || 'unknown',
});
export const reportLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: isProd ? 10 : 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { status: 'error', message: 'Batas pengiriman laporan tercapai, coba lagi dalam 1 menit' },
    keyGenerator: (req) => req.headers['x-real-ip'] || req.ip || 'unknown',
});
