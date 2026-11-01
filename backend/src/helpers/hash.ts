import { createHash } from 'node:crypto';

export function hashObject(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}
