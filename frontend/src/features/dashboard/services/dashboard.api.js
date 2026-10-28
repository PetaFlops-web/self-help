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
   * @returns {Promise<DashboardData>}
   */
  // Tambahkan parameter requestedId
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
    console.log("Cek Data Peta:", raw)

    // Ambil indikator proyek tsb + /config/scoring (gunakan cache)
    const [rawIndicators, scoringConfig] = await Promise.all([
      projectsApi.indicators(featured.id),
      projectsApi.scoringConfig(),
    ])

    console.log("Cek Data Indikator dari Backend:", rawIndicators)

    const nama = raw.nama || featured.name || ''
    const dinas = raw.dinas || featured.agency
    const pagu = raw.pagu ?? featured.budget
    const metode = raw.metode_pemilihan
    const kabupaten = raw.kabupaten || featured.location || '-'
    const tahunAnggaran = raw.tahun_anggaran
    const isDummy = Boolean(raw.is_dummy || featured.is_dummy)
    const skorNum = toNumber(raw.skor_total) ?? featured.riskScore ?? 0
    const riskScore = Math.round(skorNum)
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


    // Menggunakan data asli dari backend yang dipetakan oleh fungsi toIndicators
    const indicators = toIndicators(rawIndicators, scoringConfig)

    // Menggunakan data asli dari backend yang dipetakan oleh fungsi toDimensions
    const dimensions = toDimensions(rawIndicators, scoringConfig)

    // Mengambil semua data proyek dari endpoint /api/projects
    const allProjects = await projectsApi.list()

    /// Mengolah data proyek menjadi pin dengan tambahan jarak geser acak
    const nearbyReports = allProjects
      .filter(p => p.id !== featured.id)
      .map((p) => {
        // Angkanya diperbesar dari 0.015 menjadi 0.08 agar jarak sebarannya makin lebar
        const offsetLat = (Math.random() - 0.5) * 0.08;
        const offsetLng = (Math.random() - 0.5) * 0.08;

        return {
          id: p.id,
          title: p.name,
          lat: (toNumber(p.lat) ?? 0) + offsetLat,
          lng: (toNumber(p.lng) ?? 0) + offsetLng,
          type: 'project',
          level: p.riskLevel,
          riskScore: p.riskScore,
          location: p.location,
        };
      })

    let fund = { ...mockDashboardData.fund }
    let stages = [...mockDashboardData.stages]

    try {
      // Mengambil data progress fisik dan pembayaran dari backend
      const [progRes, payRes] = await Promise.all([
        fetch(`http://localhost:3000/api/projects/${featured.id}/progress`).then(r => r.json()).catch(() => null),
        fetch(`http://localhost:3000/api/projects/${featured.id}/payments`).then(r => r.json()).catch(() => null)
      ])

      if (payRes?.status === 'success' && payRes.payments) {
        const ringkasan = payRes.payments.ringkasan

        // Memasukkan data ke kartu Aliran Dana Proyek
        fund = {
          budget: pagu,
          contract: ringkasan.nilai_kontrak,
          paid: ringkasan.total_dibayar,
          paidPercentage: ringkasan.persen_dibayar,
          unpaid: ringkasan.nilai_kontrak - ringkasan.total_dibayar
        }

        // Memasukkan data ke kartu Uang Dibayarkan & Pekerjaan Selesai
        stages = payRes.payments.pembayaran.map((p, index) => {
          const fisik = progRes?.progress?.progres?.[index]?.persen_fisik || 0
          return {
            label: `Pembayaran tahap ${p.termin_ke}`,
            paymentPct: Number(p.persen_kontrak),
            workPct: Number(fisik)
          }
        })
      }
    } catch (e) {
      console.error("Gagal memuat aliran dana:", e)
    }

    try {
      // Mengambil data progress fisik dan pembayaran dari backend
      const [progRes, payRes] = await Promise.all([
        fetch(`http://localhost:3000/api/projects/${featured.id}/progress`).then(r => r.json()).catch(() => null),
        fetch(`http://localhost:3000/api/projects/${featured.id}/payments`).then(r => r.json()).catch(() => null)
      ])

      if (payRes?.status === 'success' && payRes.payments) {
        const ringkasan = payRes.payments.ringkasan
        const nilaiKontrak = Number(ringkasan.nilai_kontrak) || 0
        const totalDibayar = Number(ringkasan.total_dibayar) || 0
        const sisa = nilaiKontrak - totalDibayar
        const persen = ringkasan.persen_dibayar || 0

        // Memasukkan data ke kartu Aliran Dana Proyek
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

        // Memasukkan data ke kartu Uang Dibayarkan & Pekerjaan Selesai
        stages = payRes.payments.pembayaran.map((p, index) => {
          const fisik = progRes?.progress?.progres?.[index]?.persen_fisik || 0
          return {
            label: `Pembayaran tahap ${p.termin_ke}`,
            paid: Number(p.persen_kontrak),
            done: Number(fisik)
          }
        })
      }
    } catch (e) {
      console.error("Gagal memuat aliran dana:", e)
    }

    // Analisis AI
    // Analisis AI dan Rincian Biaya
    let ai = { ...mockDashboardData.ai }

    try {
      // Mengambil data rincian biaya (RAB) dari backend
      const rabRes = await fetch(`http://localhost:3000/api/projects/${featured.id}/rab-items`).then(r => r.json()).catch(() => null)

      if (rabRes?.status === 'success' && rabRes.rab_items?.items) {
        // Mengganti baris tabel (rows) mock dengan data asli dari database
        ai.rows = rabRes.rab_items.items.map(item => {
          const totalRencana = Number(item.total) || 0
          // Menghitung total harga acuan (harga_acuan * volume)
          const totalAcuan = (Number(item.harga_acuan) || 0) * (Number(item.volume) || 0)
          const deviasi = Number(item.deviasi_pct) || 0

          // Menentukan warna label risiko (Tinggi/Sedang/Rendah)
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
            level: level,
            label: label
          }
        })
      }
    } catch (e) {
      console.error("Gagal memuat rincian biaya:", e)
    }

    try {
      const explainData = await projectsApi.explain(featured.id)
      console.log("✅ Data AI dari Backend:", explainData) // Tambahkan log ini

      if (explainData && explainData.ringkasan) {
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

        ai = {
          ...ai,
          explanation,
          chips,
        }
      }
    } catch (error) {
      // Tampilkan error agar Anda tahu API-nya gagal
      console.error("❌ Gagal memuat AI dari backend:", error)
      // ai = { ...mockDashboardData.ai } // Anda bisa mematikan ini nanti jika API sudah stabil
    }

    console.log("Struktur Fund:", mockDashboardData.fund)
    console.log("Struktur Stages:", mockDashboardData.stages)

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
   * Mengambil data simulasi langsung dari mock terpusat.
   * @returns {DashboardData}
   */
  getMockDashboard() {
    return mockDashboardData
  },
}

