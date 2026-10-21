export interface Pembayaran {
  id: string;
  proyek_id: string;
  termin_ke: number | null;
  tanggal: Date | null;
  jumlah: string | null;
  persen_kontrak: string | null;
  source_id: string | null;
  source_url: string | null;
  fetched_at: Date | null;
  is_dummy: boolean;
}

export interface Progres {
  id: string;
  proyek_id: string;
  tanggal: Date | null;
  persen_fisik: string | null;
  sumber: string | null;
  source_id: string | null;
  source_url: string | null;
  fetched_at: Date | null;
  is_dummy: boolean;
}

export interface RingkasanKeuangan {
  proyek_id: string;
  nilai_kontrak: string | null;
  total_dibayar: number;
  persen_dibayar: number;
  sisa_persen: number;
  termin_count: number;
}
