import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import type { AuthTokenPayload, UserRole } from '../types/auth.js';

const VALID_ROLES: UserRole[] = ['admin', 'verifikator', 'peninjau'];

function assertPayload(decoded: unknown): AuthTokenPayload {
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Payload JWT bukan objek');
  }
  const p = decoded as Record<string, unknown>;
  if (typeof p.sub !== 'string' || p.sub.length === 0) {
    throw new Error('Payload JWT tidak memiliki field sub yang valid');
  }
  if (typeof p.surel !== 'string' || p.surel.length === 0) {
    throw new Error('Payload JWT tidak memiliki field surel yang valid');
  }
  if (typeof p.nama !== 'string' || p.nama.length === 0) {
    throw new Error('Payload JWT tidak memiliki field nama yang valid');
  }
  if (typeof p.peran !== 'string' || !VALID_ROLES.includes(p.peran as UserRole)) {
    throw new Error('Payload JWT tidak memiliki field peran yang valid');
  }
  return {
    sub: p.sub,
    surel: p.surel,
    nama: p.nama,
    peran: p.peran as UserRole,
  };
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
  });
  return assertPayload(decoded);
}
