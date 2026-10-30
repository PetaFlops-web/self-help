import rateLimit from 'express-rate-limit';
import { isProd } from '../config/env.js';

export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: isProd ? 100 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Terlalu banyak request, coba lagi nanti' },
  keyGenerator: (req) => req.headers['x-real-ip'] as string || req.ip || 'unknown',
});

export const llmLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: isProd ? 5 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Batas permintaan LLM tercapai, coba lagi dalam 1 menit' },
  keyGenerator: (req) => req.headers['x-real-ip'] as string || req.ip || 'unknown',
});

// LLM-08 / NFR-11: batas per alamat IP per hari untuk endpoint LLM, melengkapi
// llmLimiter (burst per menit) sebagai pembatas kuota harian.
export const llmDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: isProd ? 50 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Batas permintaan LLM harian tercapai, coba lagi besok' },
  keyGenerator: (req) => req.headers['x-real-ip'] as string || req.ip || 'unknown',
});

export const reportLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: isProd ? 10 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Batas pengiriman laporan tercapai, coba lagi dalam 1 menit' },
  keyGenerator: (req) => req.headers['x-real-ip'] as string || req.ip || 'unknown',
});
