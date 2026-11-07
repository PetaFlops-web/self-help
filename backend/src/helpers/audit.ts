import { insertAuditLog } from '../repositories/audit.js';
import type { AuditEntry } from '../types/audit.js';

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await insertAuditLog(entry);
  } catch (err) {
    console.warn(
      `[audit] Gagal mencatat audit (${entry.modul}/${entry.aksi}): ` +
      `${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
