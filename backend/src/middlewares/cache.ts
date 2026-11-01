import type { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis.js';


const VER_PREFIX = 'cache:ver:';
const DATA_PREFIX = 'cache:data:';

async function getNamespaceVersion(namespace: string): Promise<string> {
  const verKey = `${VER_PREFIX}${namespace}`;
  const current = await redisClient.get(verKey);
  if (current !== null) return current;
  await redisClient.set(verKey, '1', { NX: true });
  return (await redisClient.get(verKey)) ?? '1';
}

function buildDataKey(namespace: string, version: string, req: Request): string {
  return `${DATA_PREFIX}${namespace}:v${version}:${req.originalUrl}`;
}

export interface CacheOptions {
  namespace: string;
  ttl: number;
}

interface CachedPayload {
  status: number;
  body: unknown;
}

export function cache(opts: CacheOptions) {
  const { namespace, ttl } = opts;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      console.error(`[cache] Redis tidak tersedia, lewati cache (${namespace}):`, err);
      next();
      return;
    }

    res.setHeader('X-Cache', 'MISS');

    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const payload: CachedPayload = { status: res.statusCode, body };
        redisClient
          .set(dataKey, JSON.stringify(payload), { EX: ttl })
          .catch((err) => console.error(`[cache] Gagal menyimpan cache (${namespace}):`, err));
      }
      return originalJson(body);
    };

    next();
  };
}

export async function invalidateCache(...namespaces: string[]): Promise<void> {
  await Promise.all(
    namespaces.map(async (ns) => {
      try {
        const verKey = `${VER_PREFIX}${ns}`;
        await redisClient.incr(verKey);
      } catch (err) {
        console.error(`[cache] Gagal invalidasi namespace ${ns}:`, err);
      }
    }),
  );
}
