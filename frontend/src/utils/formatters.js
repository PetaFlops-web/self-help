/**
 * Memformat nilai angka menjadi format mata uang Rupiah.
 * Mengembalikan 'Belum tersedia' jika nilai null, undefined, kosong, atau bukan angka valid.
 * @param {string | number | null | undefined} value
 * @returns {string}
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return 'Belum tersedia'
  const num = Number(value)
  if (!Number.isFinite(num)) return 'Belum tersedia'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
}

/**
 * Memformat tanggal ke format lokal Indonesia (medium).
 * @param {string | Date | null | undefined} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return 'Belum tersedia'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

/**
 * Menghindari kerentanan XSS dengan melakukan escape karakter HTML berbahaya.
 * @param {string | null | undefined} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Memformat nominal Rupiah secara ringkas (contoh: "Rp4,2 miliar", "Rp750 juta").
 * @param {string | number | null | undefined} n
 * @returns {string}
 */
export function formatRupiahRingkas(n) {
  if (n === null || n === undefined || n === '') return 'Belum tersedia'
  const num = Number(n)
  if (!Number.isFinite(num)) return 'Belum tersedia'

  const abs = Math.abs(num)
  if (abs >= 1e12) {
    const formatted = (num / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 1 })
    return `Rp${formatted} triliun`
  }
  if (abs >= 1e9) {
    const formatted = (num / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })
    return `Rp${formatted} miliar`
  }
  if (abs >= 1e6) {
    const formatted = (num / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })
    return `Rp${formatted} juta`
  }
  if (abs >= 1e3) {
    const formatted = (num / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 1 })
    return `Rp${formatted} ribu`
  }
  if (num === 0) {
    return 'Rp0'
  }
  return `Rp${num.toLocaleString('id-ID')}`
}

