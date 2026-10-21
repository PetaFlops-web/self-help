/** Baris tabel `dokumen` (Fase 9). */
export interface Document {
  id: string;
  proyek_id: string;
  jenis: string;
  wajib: boolean;
  dipublikasikan: boolean;
  tanggal: Date | null;
  source_id: string | null;
  source_url: string | null;
  fetched_at: Date | null;
  is_dummy: boolean;
}

/** Baris tabel `prosedur_checklist` (Fase 9). */
export interface ProcedureChecklist {
  id: string;
  proyek_id: string;
  tahapan: string;
  terpenuhi: boolean;
  source_id: string | null;
  source_url: string | null;
  fetched_at: Date | null;
  is_dummy: boolean;
}
