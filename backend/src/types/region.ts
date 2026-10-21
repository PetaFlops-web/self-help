/** Baris tabel `wilayah` (SRS 4.1). */
export interface RegionRow {
  kode_bps: string;
  nama: string;
  lat: string | null;
  lng: string | null;
  /** Poligon batas (jsonb, SRC-08). */
  geojson: unknown | null;
}
