// Konfigurasi bersama untuk modul laporan admin.
// Status, transisi, kategori, lembaga, dan alasan penolakan.

/** Enam status siklus laporan (FR-27). */
export const REPORT_STATUSES = [
  'Dilaporkan',
  'Diverifikasi',
  'Diteruskan',
  'Ditindaklanjuti',
  'Selesai',
  'Ditolak',
]

/**
 * Transisi status yang sah menurut backend (admin-reports.ts TRANSITIONS).
 * Hanya tombol transisi sah yang dirender di UI.
 */
export const STATUS_TRANSITIONS = {
  Dilaporkan: ['Diverifikasi', 'Ditolak'],
  Diverifikasi: ['Diteruskan', 'Selesai'],
  Diteruskan: ['Ditindaklanjuti'],
  Ditindaklanjuti: ['Selesai'],
}

/**
 * Forward hanya sah dari status Diverifikasi
 * (backend: isTransitionValid(existing.status, 'Diteruskan')).
 */
export function canForward(status) {
  return status === 'Diverifikasi'
}

/** Warna badge status — sesuai usulan §6 design-system.md. */
export const STATUS_BADGE = {
  Dilaporkan: { text: 'var(--c-info)', bg: 'var(--c-info-soft)' },
  Diverifikasi: { text: 'var(--c-success)', bg: 'var(--c-success-soft)' },
  Diteruskan: { text: 'var(--c-info)', bg: 'var(--c-info-soft)' },
  Ditindaklanjuti: { text: 'var(--c-warning)', bg: 'var(--c-warning-soft)' },
  Selesai: { text: 'var(--c-success)', bg: 'var(--c-success-soft)' },
  Ditolak: { text: 'var(--c-danger)', bg: 'var(--c-danger-soft)' },
}

/** Label tampilan untuk kategori laporan. */
export const KATEGORI_LABELS = {
  infrastructure: 'Infrastruktur',
  fund_flow: 'Arus Dana',
  other: 'Lainnya',
}

/** Opsi filter kategori untuk dropdown. */
export const KATEGORI_OPTIONS = [
  { value: '', label: 'Semua kategori' },
  { value: 'infrastructure', label: 'Infrastruktur' },
  { value: 'fund_flow', label: 'Arus Dana' },
  { value: 'other', label: 'Lainnya' },
]

/** Label lembaga tujuan untuk forward (LLM_TARGET_INSTITUTIONS). */
export const LEMBAGA_LABELS = {
  inspektorat: 'Inspektorat',
  BPK: 'BPK',
  KPK: 'KPK',
  Ombudsman: 'Ombudsman',
  dinas_terkait: 'Dinas Terkait',
}

/** Daftar lembaga untuk kartu radio forward — label + deskripsi sesuai frame 03c. */
export const LEMBAGA_OPTIONS = [
  { value: 'inspektorat', label: 'Inspektorat', desc: 'Pengawas internal pertama untuk audit uji petik lapangan.' },
  { value: 'BPK', label: 'BPK', desc: 'Audit kepatuhan belanja modal APBD & kesesuaian SP2D.' },
  { value: 'Ombudsman', label: 'Ombudsman', desc: 'Pemeriksaan dugaan maladministrasi layanan publik.' },
  { value: 'KPK', label: 'KPK', desc: 'Koordinasi pencegahan tindak pidana korupsi pengadaan barang/jasa.' },
  { value: 'dinas_terkait', label: 'Dinas Terkait', desc: 'Dinas teknis yang mengelola paket pekerjaan terkait.' },
]

/**
 * Daftar alasan penolakan baku — sesuai frame 03b.
 * Setiap opsi punya judul dan deskripsi untuk kartu radio.
 */
export const ALASAN_TOLAK_OPTIONS = [
  { value: 'Bukan proyek publik / APBD', desc: 'Objek yang dilaporkan bukan bagian dari proyek yang dibiayai APBD.' },
  { value: 'Di luar radius proyek terkait', desc: 'Koordinat geolokasi pelapor tidak beririsan dengan trase fisik paket pekerjaan.' },
  { value: 'Bukti foto tidak relevan / tidak jelas', desc: 'Foto buram, gelap, atau tidak menampilkan indikasi deviasi fisik pekerjaan.' },
  { value: 'Laporan duplikat / tiket serupa sedang berjalan', desc: 'Telah dilaporkan sebelumnya dengan materi laporan dan titik lokasi yang identik.' },
]

/**
 * Menghitung umur laporan (hari) dari tanggal dibuat.
 * @param {string | null} dibuatPada
 * @returns {string} — mis. "6 hari", "7 jam", "—"
 */
export function reportAge(dibuatPada) {
  if (!dibuatPada) return '—'
  const created = new Date(dibuatPada)
  if (Number.isNaN(created.getTime())) return '—'
  const now = new Date()
  const diffMs = now - created
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays >= 1) return `${diffDays} hari`
  if (diffHours >= 1) return `${diffHours} jam`
  return '< 1 jam'
}

/**
 * Label peran untuk tampilan.
 */
export const PERAN_LABELS = {
  admin: 'Administrator Sistem',
  verifikator: 'Verifikator',
  peninjau: 'Peninjau',
}
