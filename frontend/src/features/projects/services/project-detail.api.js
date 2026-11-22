import { http } from '@/services/api/http'
import { endpoints } from '@/services/api/endpoints'
import { projectsApi } from '@/services/api/projects.api'
import { kategoriToLevel, toIndicators, toNumber, toProjectReportsPanel } from '@/services/api/mappers'

/** Enam dimensi indikator risiko dengan label publiknya (urutan radar D1→D6). */
export const DIMENSION_DEFS = [
  { key: 'D1', label: 'Anggaran' },
  { key: 'D2', label: 'Pengadaan' },
  { key: 'D3', label: 'Pengawasan' },
  { key: 'D4', label: 'Pembayaran' },
  { key: 'D5', label: 'Prosedur' },
  { key: 'D6', label: 'Keterbukaan' },
]

/** Poin per tingkat dipakai HANYA untuk menggambar radar dimensi, bukan menghitung skor. */
const LEVEL_POINTS = { rendah: 10, sedang: 50, tinggi: 100 }
const LEVEL_LABEL = { high: 'Tinggi', attention: 'Sedang', low: 'Rendah' }
const LEVEL_ORDER = { high: 3, attention: 2, low: 1 }

/** Label asal data (DR-09): proyek manual admin tidak boleh tampil seolah dokumen resmi. */
const ASAL_DATA_INFO = {
  pemerintah: { label: 'Sumber resmi pemerintah', tone: 'official' },
  manual_admin: { label: 'Input manual admin', tone: 'manual' },
  dummy: { label: 'Data simulasi', tone: 'dummy' },
}

const STATUS_LABEL = {
  perencanaan: 'Perencanaan',
  tender: 'Tahap tender',
  pelaksanaan: 'Sedang dilaksanakan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

const MATCH_STATUS_LABEL = {
  matched: 'Cocok antar sumber',
  unmatched: 'Belum cocok antar sumber',
}

const LEMBAGA_LABEL = {
  inspektorat: 'Inspektorat',
  BPK: 'BPK',
  KPK: 'KPK',
  Ombudsman: 'Ombudsman',
  dinas_terkait: 'Dinas terkait',
}

/** Membersihkan nilai teks label dari tanda kutip/spasi berlebih pada data sumber. */
export function cleanLabel(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/^['"\s]+|['"\s]+$/g, '')
}

/**
 * Memformat angka menjadi persen gaya Indonesia.
 * @param {string | number | null | undefined} value
 * @param {number} [digits=1]
 * @returns {string}
 */
export function formatPercent(value, digits = 1) {
  const num = toNumber(value)
  if (num === null) return '—'
  return `${num.toLocaleString('id-ID', { maximumFractionDigits: digits })}%`
}

/**
 * Memformat nominal rupiah untuk sel tabel (jatuh ke '—' bila kosong).
 * @param {string | number | null | undefined} value
 * @returns {string}
 */
export function formatMoney(value) {
  const num = toNumber(value)
  if (num === null) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
}

/**
 * Memformat tanggal ke bentuk pendek Indonesia (contoh: 15 Apr 2024).
 * @param {string | Date | null | undefined} value
 * @returns {string}
 */
export function formatShortDate(value) {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/**
 * Mengubah nilai menjadi objek Date yang valid (atau null).
 * @param {string | Date | null | undefined} value
 * @returns {Date | null}
 */
function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Label status proyek untuk warga.
 * @param {string | null | undefined} status
 * @returns {string}
 */
export function statusLabel(status) {
  const norm = cleanLabel(status).toLowerCase()
  if (!norm) return 'Status belum tersedia'
  return STATUS_LABEL[norm] || norm.charAt(0).toUpperCase() + norm.slice(1)
}

/**
 * Informasi label asal data proyek (DR-09).
 * @param {Record<string, any> | null | undefined} raw
 * @returns {{ label: string, tone: string }}
 */
export function asalDataInfo(raw) {
  const key = cleanLabel(raw?.asal_data).toLowerCase()
  if (ASAL_DATA_INFO[key]) return ASAL_DATA_INFO[key]
  if (raw?.is_dummy) return ASAL_DATA_INFO.dummy
  return { label: key ? key : 'Sumber belum dilabeli', tone: 'unknown' }
}

/**
 * Label status pencocokan paket antarsumber (SiRUP ↔ SPSE).
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function matchStatusLabel(value) {
  const key = cleanLabel(value).toLowerCase()
  return MATCH_STATUS_LABEL[key] || (key ? key : 'Belum ada status pencocokan')
}

/**
 * Menyusun tingkat temuan tertinggi per dimensi dari indikator temuan proyek.
 * Nilai ini adalah TINGKAT TEMUAN (rendah/sedang/tinggi), bukan skor dimensi.
 * @param {Array<Record<string, any>> | null | undefined} rawIndicators
 * @returns {Array<{ key: string, label: string, level: string | null, levelLabel: string, points: number, count: number, codes: string[] }>}
 */
export function toDimensionLevels(rawIndicators) {
  const list = Array.isArray(rawIndicators) ? rawIndicators : []

  return DIMENSION_DEFS.map((def) => {
    const matched = list.filter((it) => String(it?.dimensi || '').toUpperCase() === def.key)
    if (matched.length === 0) {
      return { key: def.key, label: def.label, level: null, levelLabel: 'Data belum cukup', points: 0, count: 0, codes: [] }
    }

    let level = 'low'
    for (const it of matched) {
      const norm = String(it?.tingkat || '').trim().toLowerCase()
      const candidate = norm === 'tinggi' ? 'high' : norm === 'sedang' ? 'attention' : 'low'
      if (LEVEL_ORDER[candidate] > LEVEL_ORDER[level]) level = candidate
    }

    const points = LEVEL_POINTS[level === 'high' ? 'tinggi' : level === 'attention' ? 'sedang' : 'rendah'] ?? 10
    return {
      key: def.key,
      label: def.label,
      level,
      levelLabel: LEVEL_LABEL[level],
      points,
      count: matched.length,
      codes: matched.map((it) => it?.kode_aturan).filter(Boolean),
    }
  })
}

/**
 * Daftar indikator temuan untuk tabel (nama aturan, uraian, nilai/ambang, sumber, tingkat).
 * @param {Array<Record<string, any>> | null | undefined} rawIndicators
 * @param {Record<string, any> | null | undefined} [scoringConfig]
 * @returns {Array<Record<string, any>>}
 */
export function toIndicatorRows(rawIndicators, scoringConfig) {
  const list = Array.isArray(rawIndicators) ? rawIndicators : []
  const byCode = new Map(list.map((it) => [it?.kode_aturan || it?.id, it]))

  return toIndicators(list, scoringConfig).map((row) => {
    const raw = byCode.get(row.key) || {}
    return {
      ...row,
      dimensi: String(raw?.dimensi || '').toUpperCase() || '—',
      kode: cleanLabel(raw?.kode_aturan) || '—',
      sumber: cleanLabel(raw?.sumber) || '—',
      dihitungPada: raw?.dihitung_pada || null,
      uraian: cleanLabel(raw?.uraian_aturan) || row.description || '',
    }
  })
}

/**
 * Ringkasan uang proyek: pagu, HPS, nilai kontrak, dan realisasi pembayaran.
 * @param {Record<string, any>} raw - Proyek mentah dari API.
 * @param {Record<string, any> | null} [ringkasan] - `payments.ringkasan` bila tersedia.
 * @returns {Record<string, any>}
 */
export function toMoney(raw, ringkasan) {
  const pagu = toNumber(raw?.pagu)
  const nilaiKontrak = toNumber(ringkasan?.nilai_kontrak) ?? toNumber(raw?.nilai_kontrak)
  const totalDibayar = toNumber(ringkasan?.total_dibayar)
  const persenDibayar = toNumber(ringkasan?.persen_dibayar)
  const sisa = nilaiKontrak !== null && totalDibayar !== null ? nilaiKontrak - totalDibayar : null

  return {
    pagu,
    hps: toNumber(raw?.hps),
    nilaiKontrak,
    totalDibayar,
    persenDibayar,
    sisa,
    sisaPersen: toNumber(ringkasan?.sisa_persen),
    terminCount: toNumber(ringkasan?.termin_count),
  }
}

/**
 * Baris pembayaran per termin, dilengkapi persen progres fisik terdekat sebelum tanggal bayar.
 * @param {Record<string, any> | null} paymentsResponse - Respons `GET /projects/{id}/payments`.
 * @param {Array<Record<string, any>>} progressRows - Baris progres hasil toProgressRows().
 * @returns {Array<Record<string, any>>}
 */
export function toPaymentRows(paymentsResponse, progressRows = []) {
  const list = paymentsResponse?.payments?.pembayaran
  if (!Array.isArray(list)) return []

  return list
    .map((p) => {
      const tanggal = toDate(p?.tanggal)
      const fisik = progressRows
        .filter((pr) => pr.date && tanggal && pr.date <= tanggal)
        .sort((a, b) => b.date - a.date)[0]

      return {
        id: p?.id,
        termin: toNumber(p?.termin_ke),
        date: tanggal,
        dateLabel: formatShortDate(p?.tanggal),
        jumlah: toNumber(p?.jumlah),
        jumlahLabel: formatMoney(p?.jumlah),
        persenKontrak: toNumber(p?.persen_kontrak),
        persenLabel: formatPercent(p?.persen_kontrak),
        persenFisik: fisik ? fisik.persenFisik : null,
        persenFisikLabel: fisik ? formatPercent(fisik.persenFisik) : '—',
        isDummy: Boolean(p?.is_dummy),
      }
    })
    .sort((a, b) => (b.termin ?? 0) - (a.termin ?? 0))
}

/**
 * Baris progres fisik, terbaru lebih dahulu.
 * @param {Record<string, any> | null} progressResponse - Respons `GET /projects/{id}/progress`.
 * @returns {Array<Record<string, any>>}
 */
export function toProgressRows(progressResponse) {
  const list = progressResponse?.progress?.progres
  if (!Array.isArray(list)) return []

  return list
    .map((p) => ({
      id: p?.id,
      date: toDate(p?.tanggal),
      dateLabel: formatShortDate(p?.tanggal),
      persenFisik: toNumber(p?.persen_fisik),
      sumber: cleanLabel(p?.sumber) || 'Tidak disebutkan',
      isDummy: Boolean(p?.is_dummy),
    }))
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
}

/**
 * Baris item RAB beserta pembanding harga acuan dan deviasinya.
 * @param {Record<string, any> | null} rabResponse - Respons `GET /projects/{id}/rab-items`.
 * @returns {{ items: Array<Record<string, any>>, totalRencana: number | null, totalAcuan: number | null }}
 */
export function toRabRows(rabResponse) {
  const list = rabResponse?.rab_items?.items
  if (!Array.isArray(list)) return { items: [], totalRencana: null, totalAcuan: null }

  const items = list.map((item) => {
    const volume = toNumber(item?.volume) ?? 0
    const hargaSatuan = toNumber(item?.harga_satuan)
    const totalRencana = toNumber(item?.total) ?? (hargaSatuan !== null ? hargaSatuan * volume : null)
    const hargaAcuan = toNumber(item?.harga_acuan)
    const totalAcuan = hargaAcuan !== null ? hargaAcuan * volume : null
    const deviasi = toNumber(item?.deviasi_pct)

    let level = 'low'
    if (deviasi !== null && deviasi > 15) level = 'high'
    else if (deviasi !== null && deviasi > 5) level = 'attention'

    return {
      id: item?.id,
      uraian: cleanLabel(item?.uraian) || '—',
      satuan: cleanLabel(item?.satuan) || '—',
      volume,
      hargaSatuan,
      hargaSatuanLabel: formatMoney(hargaSatuan),
      totalRencana,
      totalRencanaLabel: formatMoney(totalRencana),
      totalAcuan,
      totalAcuanLabel: formatMoney(totalAcuan),
      kodeAcuan: cleanLabel(item?.kode_harga_acuan) || '—',
      deviasi,
      deviasiLabel: deviasi === null ? '—' : `${deviasi > 0 ? '+' : ''}${formatPercent(deviasi)}`,
      level,
      levelLabel: LEVEL_LABEL[level] || 'Rendah',
      isDummy: Boolean(item?.is_dummy),
    }
  })

  const sumRencana = items.reduce((acc, it) => acc + (it.totalRencana || 0), 0)
  const sumAcuan = items.reduce((acc, it) => acc + (it.totalAcuan || 0), 0)

  return { items, totalRencana: sumRencana || null, totalAcuan: sumAcuan || null }
}

/**
 * Dokumen publik proyek beserta ringkasan publikasinya.
 * @param {Record<string, any> | null} response - Respons `GET /projects/{id}/documents`.
 * @returns {{ items: Array<Record<string, any>>, total: number, wajib: number, terpublikasi: number, belumPublik: number }}
 */
export function toDocumentRows(response) {
  const payload = response?.documents
  const list = Array.isArray(payload?.documents) ? payload.documents : []

  const items = list.map((d) => ({
    id: d?.id,
    jenis: cleanLabel(d?.jenis) || '—',
    wajib: Boolean(d?.wajib),
    dipublikasikan: Boolean(d?.dipublikasikan),
    dateRaw: d?.tanggal || null,
    dateLabel: formatShortDate(d?.tanggal),
    isDummy: Boolean(d?.is_dummy),
  }))

  const wajib = toNumber(payload?.ringkasan?.wajib) ?? items.filter((d) => d.wajib).length
  const belumPublik = toNumber(payload?.ringkasan?.belum_publik) ?? items.filter((d) => !d.dipublikasikan).length

  return {
    items,
    total: toNumber(payload?.ringkasan?.total) ?? items.length,
    wajib,
    terpublikasi: items.filter((d) => d.dipublikasikan).length,
    belumPublik,
  }
}

/**
 * Tahapan checklist prosedur proyek.
 * @param {Record<string, any> | null} response - Respons `GET /projects/{id}/procedure-checklist`.
 * @returns {{ items: Array<{ id: string, tahapan: string, terpenuhi: boolean }>, total: number, terpenuhi: number, tidakTerpenuhi: number }}
 */
export function toChecklistRows(response) {
  const payload = response?.procedure_checklist
  const list = Array.isArray(payload?.checklist) ? payload.checklist : []

  const items = list.map((c) => ({
    id: c?.id,
    tahapan: cleanLabel(c?.tahapan) || '—',
    terpenuhi: Boolean(c?.terpenuhi),
  }))

  return {
    items,
    total: toNumber(payload?.ringkasan?.total) ?? items.length,
    terpenuhi: toNumber(payload?.ringkasan?.terpenuhi) ?? items.filter((c) => c.terpenuhi).length,
    tidakTerpenuhi: toNumber(payload?.ringkasan?.tidak_terpenuhi) ?? items.filter((c) => !c.terpenuhi).length,
  }
}

/**
 * Linimasa proyek: RUP → dokumen → pembayaran termin → progres fisik (FR-09).
 * @param {{ raw: Record<string, any>, payments: Array<Record<string, any>>, progress: Array<Record<string, any>>, documents: ReturnType<typeof toDocumentRows> }} input
 * @returns {Array<Record<string, any>>}
 */
export function toTimeline({ raw, payments, progress, documents }) {
  const entries = []

  const rupDate = toDate(raw?.pengumuman_rup_tgl)
  if (rupDate) {
    entries.push({
      key: 'rup',
      date: rupDate,
      dateLabel: formatShortDate(raw.pengumuman_rup_tgl),
      kind: 'rup',
      title: 'Pengumuman Rencana Umum Pengadaan (RUP)',
      detail: cleanLabel(raw?.kode_rup) || 'RUP belum tercatat',
    })
  }

  for (const doc of documents.items) {
    const date = toDate(doc.dateRaw)
    if (!date) continue
    entries.push({
      key: `dok-${doc.id}`,
      date,
      dateLabel: doc.dateLabel,
      kind: 'dokumen',
      title: `Dokumen: ${doc.jenis}`,
      detail: doc.dipublikasikan ? 'Dipublikasikan' : 'Belum dipublikasikan',
      muted: !doc.dipublikasikan,
    })
  }

  for (const p of payments) {
    if (!p.date) continue
    entries.push({
      key: `bayar-${p.id}`,
      date: p.date,
      dateLabel: p.dateLabel,
      kind: 'pembayaran',
      title: `Pembayaran termin ${p.termin ?? '—'}`,
      detail: `${p.jumlahLabel} (${p.persenLabel} kontrak)`,
      isDummy: p.isDummy,
    })
  }

  for (const pr of progress) {
    if (!pr.date) continue
    entries.push({
      key: `progres-${pr.id}`,
      date: pr.date,
      dateLabel: pr.dateLabel,
      kind: 'progres',
      title: `Progres fisik ${formatPercent(pr.persenFisik)}`,
      detail: pr.sumber,
      isDummy: pr.isDummy,
    })
  }

  return entries.sort((a, b) => a.date - b.date)
}

/**
 * Melengkapi panel laporan warga dengan hitungan status dari payload detail proyek.
 * @param {Record<string, any>} panel - Hasil toProjectReportsPanel().
 * @param {Record<string, any>} raw - Proyek mentah dari API.
 * @returns {Record<string, any>}
 */
function attachReportSummary(panel, raw) {
  return {
    ...panel,
    summary: {
      menunggu: toNumber(raw?.laporan_menunggu) ?? 0,
      selesai: toNumber(raw?.laporan_selesai) ?? 0,
    },
  }
}

/**
 * Membaca respons error tidak fatal (endpoint pendukung) menjadi null.
 * @param {Promise<any>} promise
 * @returns {Promise<any | null>}
 */
async function safe(promise) {
  try {
    const value = await promise
    return value?.status === 'error' ? null : value
  } catch {
    return null
  }
}

/**
 * Memuat seluruh data halaman detail proyek dalam satu putaran paralel.
 * Kegagalan endpoint pendukung tidak menggagalkan halaman; hanya proyek yang wajib ada.
 * @param {string} id
 * @returns {Promise<Record<string, any>>}
 */
export async function loadProjectDetail(id) {
  const project = await projectsApi.get(id)
  const raw = project.raw || {}

  const [indicatorsRes, paymentsRes, progressRes, rabRes, documentsRes, checklistRes, scoringRes] =
    await Promise.allSettled([
      safe(projectsApi.indicators(id)),
      safe(projectsApi.payments(id)),
      safe(projectsApi.progress(id)),
      safe(projectsApi.rabItems(id)),
      safe(http.get(endpoints.projectDocuments(id)).then((r) => r?.data)),
      safe(http.get(endpoints.projectProcedureChecklist(id)).then((r) => r?.data)),
      safe(projectsApi.scoringConfig()),
    ])

  const pick = (res) => (res.status === 'fulfilled' ? res.value : null)

  const rawIndicators = pick(indicatorsRes) || []
  const scoringConfig = pick(scoringRes)
  const paymentsResponse = pick(paymentsRes)
  const progressRows = toProgressRows(pick(progressRes))
  const payments = toPaymentRows(paymentsResponse, progressRows)
  const documents = toDocumentRows(pick(documentsRes))

  return {
    project,
    raw,
    money: toMoney(raw, paymentsResponse?.payments?.ringkasan),
    indicators: toIndicatorRows(rawIndicators, scoringConfig),
    dimensions: toDimensionLevels(rawIndicators),
    payments,
    progress: progressRows,
    rab: toRabRows(pick(rabRes)),
    documents,
    checklist: toChecklistRows(pick(checklistRes)),
    reports: attachReportSummary(toProjectReportsPanel(raw), raw),
    timeline: toTimeline({ raw, payments, progress: progressRows, documents }),
    asalData: asalDataInfo(raw),
    matchLabel: matchStatusLabel(raw?.match_status),
    statusLabel: statusLabel(raw?.status),
    riskLevel: kategoriToLevel(raw?.kategori, raw?.skor_total),
    riskScore: toNumber(raw?.skor_total),
    categoryLabel: cleanLabel(raw?.kategori) || 'Belum tersedia',
  }
}

/**
 * Memuat penjelasan bahasa awam (LLM-T1). Dipanggil terpisah agar tidak menahan render (NFR-03).
 * @param {string} id
 * @returns {Promise<{ paragraphs: string[], temuan: Array<Record<string, any>>, keterbatasan: string[], saran: Array<{ langkah: string, lembaga: string }>, sourceLabel: string, createdAtLabel: string } | null>}
 */
export async function loadProjectExplanation(id) {
  try {
    const data = await projectsApi.explain(id)
    if (!data || (!data.ringkasan && !Array.isArray(data.temuan))) return null

    const temuan = (Array.isArray(data.temuan) ? data.temuan : []).map((t) => ({
      kode: cleanLabel(t?.kode_aturan) || '',
      penjelasan: cleanLabel(t?.penjelasan) || '',
      arti: cleanLabel(t?.arti_bagi_warga) || '',
    }))

    const saran = (Array.isArray(data.saran_tindak_lanjut) ? data.saran_tindak_lanjut : []).map((s) => ({
      langkah: cleanLabel(s?.langkah) || '',
      lembaga: LEMBAGA_LABEL[s?.lembaga] || cleanLabel(s?.lembaga) || 'Lembaga terkait',
    }))

    const sourceMap = { llm: 'AI', cache: 'AI (tersimpan)', template: 'Templat cadangan', fallback: 'Templat cadangan' }
    const createdAt = toDate(data.dibuat_pada)

    return {
      paragraphs: [cleanLabel(data.ringkasan)].filter(Boolean),
      temuan,
      keterbatasan: (Array.isArray(data.keterbatasan) ? data.keterbatasan : []).map(cleanLabel).filter(Boolean),
      saran,
      penafian: cleanLabel(data.penafian),
      sourceLabel: sourceMap[data.generated_by] || 'Templat cadangan',
      createdAtLabel: createdAt ? `Dibuat ${formatShortDate(createdAt)}` : '',
    }
  } catch {
    return null
  }
}
