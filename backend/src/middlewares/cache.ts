import type { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis.js';

/**
 * Cache-aside response GET berbasis Redis (Fase 17).
 *
 * Strategi versioned-namespace: tiap namespace punya counter versi
 * (`cache:ver:<ns>`). Key cache memuat versi tersebut, sehingga invalidasi
 * cukup meng-`INCR` counter — semua key versi lama otomatis tidak terbaca
 * lagi dan kedaluwarsa sendiri lewat TTL. Tidak perlu `SCAN`/`KEYS` (O(1),
 * aman di produksi).
 *
 * Fail-open: bila Redis error/down, request tetap dilayani dari DB — cache
 * tidak boleh membuat request gagal.
 */

const VER_PREFIX = 'cache:ver:';
const DATA_PREFIX = 'cache:data:';

async function getNamespaceVersion(namespace: string): Promise<string> {
  const verKey = `${VER_PREFIX}${namespace}`;
  const current = await redisClient.get(verKey);
  if (current !== null) return current;
  // Inisialisasi versi pertama secara atomik; SET NX agar tidak menimpa
  // versi yang mungkin baru saja dibuat proses lain.
  await redisClient.set(verKey, '1', { NX: true });
  return (await redisClient.get(verKey)) ?? '1';
}

function buildDataKey(namespace: string, version: string, req: Request): string {
  return `${DATA_PREFIX}${namespace}:v${version}:${req.originalUrl}`;
}

export interface CacheOptions {
  /** Nama namespace untuk pengelompokan + invalidasi (mis. 'projects'). */
  namespace: string;
  /** Umur cache dalam detik. */
  ttl: number;
}

interface CachedPayload {
  status: number;
  body: unknown;
}

/**
 * Middleware cache untuk route GET. HIT → kirim body tersimpan dengan
 * `X-Cache: HIT`. MISS → intercept `res.json`, simpan body bila HTTP 2xx,
 * set `X-Cache: MISS`.
 */
export function cache(opts: CacheOptions) {
  const { namespace, ttl } = opts;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Hanya GET yang di-cache.
    if (req.method !== 'GET') {
      next();
      return;
    }

    let dataKey: string;
    try {
      const version = await getNamespaceVersion(namespace);
      dataKey = buildDataKey(namespace, version, req);

      const hit = await redisClient.get(dataKey);
      if (hit !== null) {
        const payload = JSON.parse(hit) as CachedPayload;
        res.setHeader('X-Cache', 'HIT');
        res.status(payload.status).json(payload.body);
        return;
      }
    } catch (err) {
      // Fail-open: lewati cache, ambil langsung dari DB.
      console.error(`[cache] Redis tidak tersedia, lewati cache (${namespace}):`, err);
      next();
      return;
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json untuk menyimpan body sukses ke Redis.
    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const payload: CachedPayload = { status: res.statusCode, body };
        // Simpan async; jangan blok response bila Redis lambat/error.
        redisClient
          .set(dataKey, JSON.stringify(payload), { EX: ttl })
          .catch((err) => console.error(`[cache] Gagal menyimpan cache (${namespace}):`, err));
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidasi satu atau beberapa namespace dengan menaikkan counter versinya.
 * Dipanggil setelah mutasi (POST/PATCH) yang memengaruhi data ter-cache.
 * Fail-safe: kegagalan invalidasi di-log tetapi tidak melempar error ke
 * alur mutasi (data sumber sudah berubah; cache paling lama basi selama TTL).
 */
export async function invalidateCache(...namespaces: string[]): Promise<void> {
  await Promise.all(
    namespaces.map(async (ns) => {
      try {
        const verKey = `${VER_PREFIX}${ns}`;
        // INCR membuat key dengan nilai 1 bila belum ada, lalu menaikkannya.
        await redisClient.incr(verKey);
      } catch (err) {
        console.error(`[cache] Gagal invalidasi namespace ${ns}:`, err);
      }
    }),
  );
}
