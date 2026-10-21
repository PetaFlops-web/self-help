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

export interface RabItem {
  id: string;
  proyek_id: string;
  uraian: string | null;
  satuan: string | null;
  volume: string | null;
  harga_satuan: string | null;
  kode_harga_acuan: string | null;
  harga_acuan: string | null;
  acuan_uraian: string | null;
  acuan_satuan: string | null;
  total: string | null;
  deviasi_pct: string | null;
  source_id: string | null;
  source_url: string | null;
  fetched_at: Date | null;
  is_dummy: boolean;
}

export interface RabItemsResponse {
  proyek_id: string;
  items: RabItem[];
}

