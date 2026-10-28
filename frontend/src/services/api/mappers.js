import { getRiskLevel } from '../../utils/riskScoring.js'

/**
 * @typedef {import('@/services/api/projects.api').RiskLevel} RiskLevel
 * @typedef {import('@/services/api/projects.api').Project} Project
 * @typedef {import('@/features/dashboard/types/dashboard').RiskIndicator} RiskIndicator
 * @typedef {import('@/features/dashboard/types/dashboard').RiskDimensionPoint} RiskDimensionPoint
 */

/**
 * Mengonversi nilai ke angka (number) secara aman. Mengembalikan null jika input null, undefined, kosong, atau NaN.
 * @param {string | number | null | undefined} v
 * @returns {number | null}
 */
export function toNumber(v) {
  if (v === null || v === undefined || v === '') return null
  const num = Number(v)
  return Number.isFinite(num) ? num : null
}

/**
 * Memetakan kategori risiko dari API ke tingkat risiko frontend ('low' | 'attention' | 'high').
 * Jika kategori tidak ada atau tidak cocok, diturunkan dari skor_total menggunakan getRiskLevel.
 * @param {string | null | undefined} kategori
 * @param {number | string | null | undefined} [skor]
 * @returns {RiskLevel}
 */
export function kategoriToLevel(kategori, skor) {
  if (kategori === 'Rendah') return 'low'
  if (kategori === 'Perlu Perhatian') return 'attention'
  if (kategori === 'Tinggi') return 'high'

  const numSkor = toNumber(skor)
  if (numSkor !== null) {
    return getRiskLevel(numSkor)
  }
  return 'low'
}

/**
 * Memetakan tingkat temuan indikator ('rendah' | 'sedang' | 'tinggi') ke RiskLevel frontend.
 * @param {string | null | undefined} t
 * @returns {RiskLevel}
 */
export function tingkatToLevel(t) {
  const norm = String(t || '').trim().toLowerCase()
  if (norm === 'tinggi') return 'high'
  if (norm === 'sedang') return 'attention'
  return 'low'
}

/**
 * Memetakan objek proyek mentah dari backend ke bentuk Project standar frontend.
 * Tangani null secara aman dan jangan mengisi field progress.
 * @param {Record<string, any> | null | undefined} apiProyek
 * @param {{ includeRaw?: boolean }} [options]
 * @returns {Project | null}
 */
export function toProject(apiProyek, options = {}) {
  if (!apiProyek || typeof apiProyek !== 'object') return null

  const skorNum = toNumber(apiProyek.skor_total)
  const scoreRound = Math.round(skorNum ?? 0)
  const riskLevel = kategoriToLevel(apiProyek.kategori, skorNum)

  /** @type {Project} */
  const project = {
    id: apiProyek.id,
    name: apiProyek.nama ?? '',
    location: apiProyek.kabupaten ?? '-',
    agency: apiProyek.dinas ?? undefined,
    budget: toNumber(apiProyek.pagu),
    riskScore: scoreRound,
    riskLevel,
    is_dummy: Boolean(apiProyek.is_dummy),
    updatedAt: apiProyek.fetched_at ?? undefined,
    lat: toNumber(apiProyek.lat),
    lng: toNumber(apiProyek.lng),
  }

  if (options.includeRaw) {
    project.raw = apiProyek
  }

  return project
}

/**
 * Peta ikon per dimensi indikator risiko.
 */
const DIMENSION_ICONS = {
  D1: '%',
  D2: '1',
  D3: '!',
  D4: 'Rp',
  D5: '✓',
  D6: 'i',
}

/**
 * Peta nama dimensi cadangan jika konfigurasi scoring belum memuat nama aturan.
 */
const DIMENSION_NAMES = {
  D1: 'Anggaran',
  D2: 'Pengadaan',
  D3: 'Pengawasan',
  D4: 'Pembayaran',
  D5: 'Prosedur',
  D6: 'Keterbukaan',
}

/**
 * Urutan bobot tingkat risiko untuk pengurutan indikator dari tertinggi ke terendah.
 */
const LEVEL_WEIGHT = {
  high: 3,
  attention: 2,
  low: 1,
}

/**
 * Memetakan daftar IndikatorTemuan dari API ke RiskIndicator frontend yang terurut risiko tertinggi ke terendah.
 * @param {Array<Record<string, any>> | null | undefined} listIndikator
 * @param {Record<string, any> | null | undefined} [scoringConfig]
 * @returns {RiskIndicator[]}
 */
export function toIndicators(listIndikator, scoringConfig) {
  if (!Array.isArray(listIndikator)) return []

  const rules = Array.isArray(scoringConfig?.rules) ? scoringConfig.rules : []
  const ruleMap = new Map()
  for (const r of rules) {
    if (r?.code) {
      ruleMap.set(r.code, r)
    }
  }

  const mapped = listIndikator.map((item) => {
    const dim = (item?.dimensi || '').toUpperCase()
    const rule = ruleMap.get(item?.kode_aturan)

    const icon = DIMENSION_ICONS[dim] || '!'
    const title = rule?.nama || DIMENSION_NAMES[dim] || item?.kode_aturan || 'Indikator Risiko'
    const description = item?.uraian_aturan || rule?.uraian_aturan || ''

    let meta = ''
    if (item?.nilai_terukur != null && item?.ambang != null) {
      meta = `Nilai ${item.nilai_terukur}, ambang ${item.ambang}`
    } else if (item?.nilai_terukur != null) {
      meta = `Nilai ${item.nilai_terukur}`
    } else if (item?.ambang != null) {
      meta = `Ambang ${item.ambang}`
    }

    const level = tingkatToLevel(item?.tingkat)
    const label = level === 'high' ? 'Tinggi' : level === 'attention' ? 'Sedang' : 'Rendah'

    return {
      key: item?.kode_aturan || item?.id || String(Math.random()),
      icon,
      title,
      description,
      meta,
      level,
      label,
    }
  })

  // Urutkan dari risiko tertinggi ke terendah
  return mapped.sort((a, b) => (LEVEL_WEIGHT[b.level] || 0) - (LEVEL_WEIGHT[a.level] || 0))
}

/**
 * Menghitung skor 6 dimensi risiko untuk diagram radar dari indikator temuan dan scoring config.
 * CATATAN: Ini adalah ESTIMASI dari indikator karena API backend belum menyediakan skor per dimensi secara langsung.
 *
 * @param {Array<Record<string, any>> | null | undefined} indicators
 * @param {Record<string, any> | null | undefined} [scoringConfig]
 * @returns {RiskDimensionPoint[]}
 */
export function toDimensions(indicators, scoringConfig) {
  const pointsConfig = scoringConfig?.level_points || { rendah: 10, sedang: 50, tinggi: 100 }

  const dimensionDefs = [
    { key: 'D1', label: 'Anggaran' },
    { key: 'D2', label: 'Pengadaan' },
    { key: 'D3', label: 'Pengawasan' },
    { key: 'D4', label: 'Pembayaran' },
    { key: 'D5', label: 'Prosedur' },
    { key: 'D6', label: 'Keterbukaan' },
  ]

  const indList = Array.isArray(indicators) ? indicators : []

  return dimensionDefs.map((def) => {
    const matched = indList.filter((it) => (it?.dimensi || '').toUpperCase() === def.key)
    if (matched.length === 0) {
      return { label: def.label, value: 0 }
    }

    const sum = matched.reduce((acc, it) => {
      const normTingkat = String(it?.tingkat || '').trim().toLowerCase()
      const pts = pointsConfig[normTingkat] ?? (normTingkat === 'tinggi' ? 100 : normTingkat === 'sedang' ? 50 : 10)
      return acc + pts
    }, 0)

    const avg = Math.round(sum / matched.length)
    return { label: def.label, value: avg }
  })
}

/**
 * Pemetaan nilai kategori form laporan warga ke nilai kategori backend.
 * Sementara isi nilainya sama dengan nilai form.
 * Catatan: konfirmasi nilai sah ke tim backend.
 */
export const KATEGORI_BACKEND = {
  infrastructure: 'infrastructure',
  fund_flow: 'fund_flow',
  other: 'other',
}

/**
 * Memetakan data form laporan warga dari frontend ke payload API backend (POST /reports).
 * Keterangan diisi judul di baris pertama, baris kosong, lalu deskripsi agar judul tidak hilang.
 * JANGAN mengirim anonim, kontak, maupun lampiran sampai backend mengonfirmasi field-nya.
 *
 * @param {Record<string, any>} form
 * @returns {{ proyek_id: string, kategori: string, keterangan: string }}
 */
export function toReportPayload(form) {
  const judul = (form?.title || '').trim()
  const deskripsi = (form?.description || '').trim()
  const keterangan = judul ? `${judul}\n\n${deskripsi}` : deskripsi


  // Konfirmasi nilai sah ke tim backend melalui pemetaan KATEGORI_BACKEND
  const kategori = KATEGORI_BACKEND[form?.category] || form?.category || 'infrastructure'

  // TODO: Field anonim, kontak, dan lampiran (attachments) sengaja TIDAK dikirim
  // karena backend saat ini belum memiliki field tersebut pada skema POST /reports.
  // Hanya mengirim field wajib: proyek_id, kategori, dan keterangan.

  return {
    proyek_id: form?.projectId,
    kategori,
    keterangan,
  }
}

/**
 * Memetakan respons sukses pembuatan laporan dari backend (201 Created).
 *
 * @param {Record<string, any>} response
 * @returns {{ trackingCode: string, status: string }}
 */
export function toReportResult(response) {
  const report = response?.report || {}
  return {
    trackingCode: report?.tiket || '',
    status: report?.status || '',
  }
}

/**
 * Memetakan data mentah proyek ke format panel laporan warga di MapSection.
 *
 * @param {Record<string, any> | null | undefined} raw
 * @returns {{ id: string | number, name: string, location: string, total: number, items: Array<{ code: string, category: string, status: string, level: string, dateLabel: string }> }}
 */
export function toProjectReportsPanel(raw) {
  if (!raw || typeof raw !== 'object') {
    return { id: '', name: '', location: '', total: 0, items: [], riskScore: null, riskLevel: 'low' }
  }

  const proj = raw.project && typeof raw.project === 'object' ? raw.project : raw

  const id = proj.id ?? ''
  const name = proj.nama ?? proj.name ?? ''
  const location = proj.kabupaten ?? proj.location ?? ''

  const laporanWarga = proj.laporan_warga && typeof proj.laporan_warga === 'object' ? proj.laporan_warga : {}
  const rawItems = Array.isArray(laporanWarga.items) ? laporanWarga.items : []

  const items = rawItems.map((item) => {
    const code = item?.tiket ?? '-'
    const category = item?.kategori ?? '-'
    const status = item?.status ?? '-'
    const statusNorm = String(status).toLowerCase().trim()
    const level = statusNorm === 'selesai' ? 'low' : 'attention'

    let dateLabel = '-'
    if (item?.dibuat_pada) {
      const d = new Date(item.dibuat_pada)
      if (!Number.isNaN(d.getTime())) {
        dateLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      }
    }

    return {
      code,
      category,
      status,
      level,
      dateLabel,
    }
  })

  const total = toNumber(laporanWarga.total) ?? items.length

  const riskScoreNum = toNumber(proj.skor_total)
  const riskLevel = kategoriToLevel(proj.kategori, riskScoreNum)

  return {
    id,
    name,
    location,
    total,
    items,
    riskScore: riskScoreNum === null ? null : Math.round(riskScoreNum),
    riskLevel,
  }
}


