import { insertAuditLog } from '../repositories/audit.js';
export async function recordAudit(entry) {
    try {
        await insertAuditLog(entry);
    }
    catch (err) {
        console.warn(`[audit] Gagal mencatat audit (${entry.modul}/${entry.aksi}): ` +
            `${err instanceof Error ? err.message : String(err)}`);
    }
}
