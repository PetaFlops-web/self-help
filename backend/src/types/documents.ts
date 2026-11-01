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
