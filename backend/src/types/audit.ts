export interface AuditEntry {
  aktor_id: string | null;
  aktor_nama: string;
  peran: string;
  modul: string;
  aksi: string;
  target_id: string | null;
  diff: Record<string, unknown> | null;
  ip: string | null;
}

export interface AuditLogRow {
  id: string;
  waktu: string;
  aktor_id: string | null;
  aktor_nama: string;
  peran: string;
  modul: string;
  aksi: string;
  target_id: string | null;
  diff: Record<string, unknown> | null;
  ip: string | null;
}

export interface AuditListResult {
  rows: AuditLogRow[];
  total: number;
}
