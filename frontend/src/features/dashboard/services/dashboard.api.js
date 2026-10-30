import { projectsApi } from '@/services/api/projects.api'
import { toIndicators, toDimensions, toNumber } from '@/services/api/mappers'
import { escapeHtml, formatRupiahRingkas } from '@/utils/formatters'
import { getRiskLabel } from '@/utils/riskScoring'
import { mockDashboardData } from '@/mocks/dashboard'

/** @typedef {import('../types/dashboard').DashboardData} DashboardData */

export const dashboardApi = {
  /**
   * Mengambil dan merangkum data dashboard dari berbagai endpoint API backend.
   * Tidak lagi menyembunyikan error dengan fallback mock agar composable dapat mendeteksi status backend.
   * @param {string | null} [requestedId] - ID proyek yang diminta; jika null, pakai VITE_FEATURED_PROJECT_ID atau proyek skor tertinggi.
   * @returns {Promise<DashboardData>}
   */
  async getDashboard(requestedId = null) {
    // Prioritaskan ID yang diminta/diklik. Jika tidak ada, baru pakai ID default.
    const featuredId = requestedId || import.meta.env.VITE_FEATURED_PROJECT_ID

    let featured = null

    if (featuredId) {
      try {
        featured = await projectsApi.get(featuredId)
      } catch {
        // Jika ID dari env tidak ditemukan, lanjutkan mencari dari daftar proyek
        featured = null
      }
    }

    if (!featured) {
      const projects = await projectsApi.list()
      if (!projects || projects.length === 0) {
        throw new Error('Daftar proyek kosong')
      }

      // Pilih proyek unggulan = skor_total tertinggi
      const sorted = [...projects].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
      const top = sorted[0]
      featured = await projectsApi.get(top.id)
    }

    const raw = featured.raw || featured

    // Ambil indikator proyek tsb + /config/scoring (gunakan cache)
    const [rawIndicators, scoringConfig] = await Promise.all([
      projectsApi.indicators(featured.id),
      projectsApi.scoringConfig(),
    ])

    const nama = raw.nama || featured.name || ''
    const dinas = raw.dinas || featured.agency
    const pagu = raw.pagu ?? featured.budget
    const metode = raw.metode_pemilihan
    const kabupaten = raw.kabupaten || featured.location || '-'
    const tahunAnggaran = raw.tahun_anggaran
    const isDummy = Boolean(raw.is_dummy || featured.is_dummy)
    const riskScore = featured.riskScore
    const riskLabel = raw.kategori || getRiskLabel(featured.riskLevel) || 'Rendah'

    // Format meta: lewati bagian yang null
    const paguText = pagu ? `Pagu ${formatRupiahRingkas(pagu)}` : null
    const metaParts = [dinas, paguText, metode].filter(Boolean)
    const meta = metaParts.join(' | ')

    // Tags
    const tagLoc = tahunAnggaran ? `${kabupaten}, TA ${tahunAnggaran}` : kabupaten
    const tags = ['Proyek', tagLoc]

    // Disclaimer: tambahkan "Data simulasi." hanya jika is_dummy true
    const disclaimer = `${isDummy ? 'Data simulasi. ' : ''}Skor adalah indikator risiko untuk diperiksa, bukan bukti pelanggaran.`

    const project = {
      id: featured.id,
      title: nama,
      titleHtml: escapeHtml(nama), // WAJIB di-escape karena HeroSection memakai v-html
      meta,
      tags,
      budgetLabel: pagu ? `Pagu ${formatRupiahRingkas(pagu)}` : '–',
      reportCount: null, // API belum punya; HeroSection sudah menampilkan "–"
      lat: toNumber(raw.lat) ?? toNumber(featured.lat) ?? 0,
      lng: toNumber(raw.lng) ?? toNumber(featured.lng) ?? 0,
      riskScore,
      riskLabel,
      riskLevel: featured.riskLevel,
      disclaimer,
    }

    // Pemetaan indikator & dimensi radar dari data backend
    const indicators = toIndicators(rawIndicators, scoringConfig)
    const dimensions = toDimensions(rawIndicators, scoringConfig)

    // Ambil semua proyek untuk pin peta sekitar; proyek unggulan dikecualikan
    const allProjects = await projectsApi.list()
    const nearbyReports = allProjects
      .filter((p) => p.id !== featured.id)
      .map((p) => {
        // Jarak geser acak agar sebaran pin lebih jelas (±0.04 derajat ≈ ±4 km)
        const offsetLat = (Math.random() - 0.5) * 0.08
        const offsetLng = (Math.random() - 0.5) * 0.08
        return {
          id: p.id,
          title: p.name,
          lat: (toNumber(p.lat) ?? 0) + offsetLat,
          lng: (toNumber(p.lng) ?? 0) + offsetLng,
          type: 'project',
          level: p.riskLevel,
          riskScore: p.riskScore,
          location: p.location,
        }
      })

    // Fetch progress, payments, dan rab-items secara paralel via projectsApi (satu putaran, bukan tiga)
    const [progRes, payRes, rabRes] = await Promise.all([
      projectsApi.progress(featured.id),
      projectsApi.payments(featured.id),
      projectsApi.rabItems(featured.id),
    ])

    // Aliran dana + tahapan pembayaran
    let fund = { ...mockDashboardData.fund }
    let stages = [...mockDashboardData.stages]

    if (payRes?.status === 'success' && payRes.payments) {
      const ringkasan = payRes.payments.ringkasan
      const nilaiKontrak = Number(ringkasan.nilai_kontrak) || 0
      const totalDibayar = Number(ringkasan.total_dibayar) || 0
      const sisa = nilaiKontrak - totalDibayar
      const persen = ringkasan.persen_dibayar || 0

      fund = {
        steps: [
          { label: '1. Anggaran daerah', value: formatRupiahRingkas(pagu || 0) },
          { label: '2. Nilai kontrak', value: formatRupiahRingkas(nilaiKontrak) },
          { label: '3. Uang yang sudah dibayarkan', value: `${formatRupiahRingkas(totalDibayar)} (${persen}%)`, accent: true },
        ],
        paidPercent: persen,
        paidLabel: `Sudah dibayarkan: ${formatRupiahRingkas(totalDibayar)}`,
        unpaidLabel: `Belum dibayarkan: ${formatRupiahRingkas(sisa)}`,
        note: 'Angka ini menunjukkan pembayaran, bukan ukuran pekerjaan yang sudah selesai.',
      }

      stages = payRes.payments.pembayaran.map((p, index) => {
        const fisik = progRes?.progress?.progres?.[index]?.persen_fisik || 0
        return {
          label: `Pembayaran tahap ${p.termin_ke}`,
          paid: Number(p.persen_kontrak),
          done: Number(fisik),
        }
      })
    }

    // Analisis AI + Rincian Biaya (RAB)
    let ai = { ...mockDashboardData.ai }

    if (rabRes?.status === 'success' && rabRes.rab_items?.items) {
      ai.rows = rabRes.rab_items.items.map((item) => {
        const totalRencana = Number(item.total) || 0
        const totalAcuan = (Number(item.harga_acuan) || 0) * (Number(item.volume) || 0)
        const deviasi = Number(item.deviasi_pct) || 0

        let level = 'low'
        let label = 'Rendah'
        if (deviasi > 15) {
          level = 'high'
          label = 'Tinggi'
        } else if (deviasi > 5) {
          level = 'attention'
          label = 'Sedang'
        }

        const tanda = deviasi > 0 ? '+' : ''

        return {
          item: item.uraian,
          budget: formatRupiahRingkas(totalRencana),
          benchmark: formatRupiahRingkas(totalAcuan),
          diff: `${tanda}${deviasi}%`,
          level,
          label,
        }
      })
    }

    // Penjelasan AI (explain) TIDAK di-fetch di sini: di production endpoint ini
    // memanggil LLM eksternal yang bisa memakan beberapa detik dan akan menahan
    // render seluruh dashboard. Explain dimuat terpisah via getExplanation()
    // sehingga data cepat (proyek, skor, peta, RAB) langsung tampil.

    return {
      project,
      nearbyReports,
      dimensions,
      indicators,
      fund,
      stages,
      ai,
    }
  },

  /**
   * Mengambil penjelasan AI (explain) untuk satu proyek secara terpisah dari
   * data dashboard utama. Dipanggil non-blocking agar first paint tidak menunggu
   * LLM. Mengembalikan null bila gagal (pemanggil mempertahankan state apa adanya).
   * @param {string} projectId
   * @returns {Promise<{ explanation: string[], chips: string[] } | null>}
   */
  async getExplanation(projectId) {
    if (!projectId) return null
    try {
      const explainData = await projectsApi.explain(projectId)
      if (!explainData || !explainData.ringkasan) return null

      const temuanList = Array.isArray(explainData.temuan) ? explainData.temuan : []
      const explanation = [
        explainData.ringkasan,
        ...temuanList.map((t) => t.penjelasan).filter(Boolean),
      ]
      if (explainData.penafian) {
        explanation.push(explainData.penafian)
      }

      const sourceLabel = explainData.generated_by === 'llm' ? 'AI' : 'templat cadangan'
      const chips = [`Dibuat oleh ${sourceLabel}`]

      const saranList = Array.isArray(explainData.saran_tindak_lanjut) ? explainData.saran_tindak_lanjut : []
      const lembagaList = saranList
        .map((s) => s?.lembaga)
        .filter(Boolean)
        .slice(0, 2)
      chips.push(...lembagaList)

      return { explanation, chips }
    } catch (error) {
      console.error('Gagal memuat AI dari backend:', error)
      return null
    }
  },

  /**
   * Mengambil data simulasi langsung dari mock terpusat.
   * @returns {DashboardData}
   */
  getMockDashboard() {
    return mockDashboardData
  },
}
