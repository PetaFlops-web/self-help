<template>
  <div class="admin-dashboard">
    <!-- Subheader / Status Bar (frame 01) -->
    <header class="dash-header">
      <div class="dash-header-info">
        <h2 class="dash-title">Ringkasan Operasional</h2>
        <p class="dash-subtitle">{{ formattedDate }} · Monitoring Pengadaan APBD &amp; Partisipasi Warga</p>
      </div>
      <div class="dash-header-actions">
        <button class="dash-refresh-btn" :disabled="loading" @click="fetchData">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M14 8A6 6 0 1 1 9.5 2.5M14 2.5v4h-4" />
          </svg>
          <span>{{ loading ? 'Memuat…' : 'Segarkan' }}</span>
        </button>
      </div>
    </header>

    <!-- Error State -->
    <div v-if="error && !loading" class="dash-alert dash-alert--danger">
      <p>{{ error }}</p>
      <button class="dash-btn-retry" @click="fetchData">Coba Lagi</button>
    </div>

    <!-- KPI Cards Grid (frame 01) -->
    <section class="dash-kpi-grid">
      <!-- Loading Skeleton -->
      <template v-if="loading && !dataLoaded">
        <div v-for="i in 4" :key="i" class="dash-kpi-card">
          <SkeletonBlock height="14px" width="60%" radius="4px" />
          <div class="dash-kpi-val-wrap">
            <SkeletonBlock height="32px" width="40%" radius="6px" />
          </div>
          <SkeletonBlock height="12px" width="80%" radius="4px" />
        </div>
        <div class="dash-kpi-card dash-kpi-card--stats">
          <div class="dash-stats-left">
            <SkeletonBlock height="16px" width="180px" radius="4px" />
            <SkeletonBlock height="12px" width="220px" radius="4px" />
          </div>
          <div class="dash-stats-center">
            <SkeletonBlock height="32px" width="240px" radius="6px" />
          </div>
          <div class="dash-stats-right">
            <SkeletonBlock height="28px" width="130px" radius="4px" />
          </div>
        </div>
      </template>

      <!-- Loaded KPI Cards -->
      <template v-else>
        <!-- KPI 1: Total Laporan -->
        <div class="dash-kpi-card">
          <span class="dash-kpi-label">Total Laporan Warga</span>
          <div class="dash-kpi-val-wrap">
            <span class="dash-kpi-value">{{ summary.kpi.totalReports }}</span>
          </div>
          <span class="dash-kpi-sub">
            <span class="dash-kpi-pill is-info">{{ summary.kpi.totalByStatus.Selesai || 0 }} Selesai</span>
            <span class="dash-kpi-hint">dari seluruh tiket masuk</span>
          </span>
        </div>

        <!-- KPI 2: Menunggu Verifikasi -->
        <div class="dash-kpi-card is-warning">
          <span class="dash-kpi-label">Menunggu Verifikasi</span>
          <div class="dash-kpi-val-wrap">
            <span class="dash-kpi-value text-warning">{{ summary.kpi.waitingVerification }}</span>
          </div>
          <span class="dash-kpi-sub">
            <span class="dash-kpi-pill is-warning">Perlu Tindakan</span>
            <span class="dash-kpi-hint">status Dilaporkan</span>
          </span>
        </div>

        <!-- KPI 3: Baris ETL Error (Admin only) -->
        <div v-if="isAdmin && summary.kpi.etlErrorsTotal !== null" class="dash-kpi-card is-danger">
          <span class="dash-kpi-label">Baris ETL Error</span>
          <div class="dash-kpi-val-wrap">
            <span class="dash-kpi-value text-danger">{{ summary.kpi.etlErrorsTotal }}</span>
          </div>
          <span class="dash-kpi-sub">
            <span class="dash-kpi-pill is-danger">Anomali</span>
            <span class="dash-kpi-hint">perlu peninjauan skema</span>
          </span>
        </div>

        <!-- KPI 4: Belum Cocok (Admin only) -->
        <div v-if="isAdmin && summary.kpi.unmatchedTotal !== null" class="dash-kpi-card">
          <span class="dash-kpi-label">Belum Cocok (SiRUP ↔ SPSE)</span>
          <div class="dash-kpi-val-wrap">
            <span class="dash-kpi-value">{{ summary.kpi.unmatchedTotal }}</span>
          </div>
          <span class="dash-kpi-sub">
            <span class="dash-kpi-pill is-subtle">Penyelarasan</span>
            <span class="dash-kpi-hint">antrean pencocokan paket</span>
          </span>
        </div>

        <!-- KPI 5: Sebaran Kategori Risiko Proyek (Berdasarkan GET /api/stats) -->
        <div class="dash-kpi-card dash-kpi-card--stats">
          <div class="dash-stats-left">
            <div class="dash-stats-title-wrap">
              <span class="dash-kpi-label">Profil Risiko Pengadaan</span>
              <span class="dash-stats-count-tag">{{ summary.projectStats.total_proyek }} Proyek</span>
            </div>
            <p class="dash-stats-hint">Monitoring agregat skor risiko dan sebaran status proyek APBD</p>
          </div>

          <div class="dash-stats-center">
            <div class="dash-risk-distribution">
              <div class="dash-risk-item is-high" title="Risiko Tinggi">
                <span class="dash-risk-badge">Tinggi</span>
                <span class="dash-risk-count">{{ summary.projectStats.kategori.Tinggi || 0 }}</span>
              </div>
              <div class="dash-risk-item is-medium" title="Perlu Perhatian">
                <span class="dash-risk-badge">Perhatian</span>
                <span class="dash-risk-count">{{ summary.projectStats.kategori['Perlu Perhatian'] || 0 }}</span>
              </div>
              <div class="dash-risk-item is-low" title="Risiko Rendah">
                <span class="dash-risk-badge">Rendah</span>
                <span class="dash-risk-count">{{ summary.projectStats.kategori.Rendah || 0 }}</span>
              </div>
            </div>
          </div>

          <div class="dash-stats-right">
            <span class="dash-stats-score-label">Rata-rata Skor Risiko</span>
            <div class="dash-stats-score-box">
              <strong class="dash-stats-score-val">{{ summary.projectStats.rata_rata_skor ?? '—' }}</strong>
              <span class="dash-stats-score-max">/ 100</span>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- Two-column Section (frame 01: 7fr / 5fr) -->
    <div class="dash-main-grid">
      <!-- Left Column: Chart placeholder & Antrean Laporan -->
      <div class="dash-left-col">
        <!-- Tren Volume (Fase 29 - Visualisasi Deret Waktu 14 Hari) -->
        <div class="dash-card dash-card--trend">
          <div class="dash-card-head">
            <div>
              <h3 class="dash-card-title">Volume Laporan &amp; Verifikasi</h3>
              <p class="dash-card-desc">Dinamika pelaporan warga 14 hari terakhir</p>
            </div>
            <!-- Legenda Grafik & Total 14 Hari -->
            <div class="dash-trend-legend">
              <span class="dash-trend-pill is-masuk" title="Laporan baru yang diterima sistem">
                <span class="dash-legend-dot dot-masuk" aria-hidden="true" />
                <span>Masuk ({{ trendTotals.total_masuk }})</span>
              </span>
              <span class="dash-trend-pill is-verif" title="Laporan yang telah diverifikasi petugas">
                <span class="dash-legend-dot dot-verif" aria-hidden="true" />
                <span>Diverifikasi ({{ trendTotals.diverifikasi }})</span>
              </span>
              <span class="dash-trend-pill is-selesai" title="Laporan yang telah dituntaskan tindak lanjutnya">
                <span class="dash-legend-dot dot-selesai" aria-hidden="true" />
                <span>Selesai ({{ trendTotals.selesai }})</span>
              </span>
            </div>
          </div>

          <!-- Chart Area -->
          <div class="dash-chart-container">
            <svg
              class="dash-trend-svg"
              :viewBox="`0 0 ${chartConfig.width} ${chartConfig.height}`"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Grafik tren volume laporan 14 hari"
            >
              <!-- Grid horizontal & label sumbu Y -->
              <g class="dash-chart-grid" aria-hidden="true">
                <g v-for="tick in chartConfig.yTicks" :key="tick.val">
                  <line
                    :x1="chartConfig.padLeft"
                    :y1="tick.y"
                    :x2="chartConfig.width - chartConfig.padRight"
                    :y2="tick.y"
                    class="dash-grid-line"
                  />
                  <text
                    :x="chartConfig.padLeft - 8"
                    :y="tick.y + 3.5"
                    class="dash-axis-label text-y"
                    text-anchor="end"
                  >
                    {{ tick.val }}
                  </text>
                </g>
              </g>

              <!-- Data Bars & Day Slots -->
              <g class="dash-chart-bars">
                <g
                  v-for="day in chartConfig.bars"
                  :key="day.tanggal"
                  class="dash-day-group"
                  :class="{ 'is-active': hoveredTrendIndex === day.index }"
                  @mouseenter="hoveredTrendIndex = day.index"
                  @mouseleave="hoveredTrendIndex = null"
                >
                  <!-- Slot hover highlight area -->
                  <rect
                    :x="day.slotX"
                    :y="chartConfig.padTop"
                    :width="day.slotW"
                    :height="chartConfig.plotH"
                    class="dash-slot-hitbox"
                  />

                  <!-- Grouped Bars: Masuk, Verif, Selesai -->
                  <rect
                    v-for="b in day.bars"
                    :key="b.key"
                    :x="b.x"
                    :y="b.h > 0 ? b.y : chartConfig.padTop + chartConfig.plotH - 1"
                    :width="b.w"
                    :height="b.h > 0 ? b.h : 1"
                    :rx="b.h > 2 ? 2 : 0"
                    :class="['dash-bar', `bar-${b.key}`, { 'is-empty': b.h === 0 }]"
                  />

                  <!-- Label Sumbu X (Tanggal DD/MM) -->
                  <text
                    :x="day.slotX + day.slotW / 2"
                    :y="chartConfig.height - 10"
                    class="dash-axis-label text-x"
                    text-anchor="middle"
                  >
                    {{ formatTrendDate(day.tanggal) }}
                  </text>
                </g>
              </g>
            </svg>

            <!-- Tooltip Interaktif saat Hover -->
            <transition name="dash-tt-fade">
              <div
                v-if="hoveredTrendIndex !== null && chartConfig.bars[hoveredTrendIndex]"
                class="dash-trend-tooltip"
                :style="tooltipPositionStyle"
              >
                <div class="dash-tt-head">
                  {{ formatFullDate(chartConfig.bars[hoveredTrendIndex].tanggal) }}
                </div>
                <div class="dash-tt-metrics">
                  <div class="dash-tt-row">
                    <span class="dash-tt-dot dot-masuk" />
                    <span class="dash-tt-name">Total Masuk</span>
                    <strong class="dash-tt-val">{{ chartConfig.bars[hoveredTrendIndex].bars[0].val }}</strong>
                  </div>
                  <div class="dash-tt-row">
                    <span class="dash-tt-dot dot-verif" />
                    <span class="dash-tt-name">Diverifikasi</span>
                    <strong class="dash-tt-val">{{ chartConfig.bars[hoveredTrendIndex].bars[1].val }}</strong>
                  </div>
                  <div class="dash-tt-row">
                    <span class="dash-tt-dot dot-selesai" />
                    <span class="dash-tt-name">Selesai</span>
                    <strong class="dash-tt-val">{{ chartConfig.bars[hoveredTrendIndex].bars[2].val }}</strong>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- Tabel Antrean Laporan (F3.3) -->
        <div class="dash-card">
          <div class="dash-card-head">
            <div>
              <h3 class="dash-card-title">Antrean Verifikasi Terbaru</h3>
              <p class="dash-card-desc">Laporan berstatus Dilaporkan yang memerlukan verifikasi</p>
            </div>
            <RouterLink to="/admin/laporan" class="dash-card-link">
              Lihat Semua ({{ summary.kpi.waitingVerification }}) →
            </RouterLink>
          </div>

          <!-- Loading state -->
          <div v-if="loading && !dataLoaded" class="dash-table-loading">
            <SkeletonBlock v-for="i in 4" :key="i" height="42px" radius="6px" class="dash-skeleton-row" />
          </div>

          <!-- Empty queue -->
          <div v-else-if="!summary.queueReports.length" class="dash-empty-state">
            <p>Tidak ada antrean laporan baru yang menunggu verifikasi saat ini.</p>
          </div>

          <!-- Queue Table -->
          <div v-else class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>TIKET</th>
                  <th>PROYEK TERKAIT</th>
                  <th>KATEGORI</th>
                  <th>UMUR</th>
                  <th>STATUS</th>
                  <th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in summary.queueReports" :key="item.tiket">
                  <td class="cell-tiket">{{ item.tiket }}</td>
                  <td class="cell-proyek">
                    <span class="cell-proyek-name">{{ item.proyek?.nama || '—' }}</span>
                    <span v-if="item.proyek?.kabupaten" class="cell-proyek-loc">{{ item.proyek.kabupaten }}</span>
                  </td>
                  <td>
                    <span class="cell-cat">{{ kategoriLabel(item.kategori) }}</span>
                  </td>
                  <td>
                    <span class="cell-umur">{{ reportAge(item.dibuat_pada) }}</span>
                  </td>
                  <td>
                    <span class="dash-badge" :style="badgeStyle(item.status)">{{ item.status }}</span>
                  </td>
                  <td>
                    <RouterLink :to="`/admin/laporan/${item.tiket}`" class="dash-btn-action">
                      Periksa →
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Column: Live Feed Audit & Peringatan Sistem -->
      <div class="dash-right-col">
        <!-- Peringatan Sistem (F3.6) -->
        <div v-if="isAdmin && summary.systemAlerts.length" class="dash-card is-alert-card">
          <div class="dash-card-head">
            <h3 class="dash-card-title text-danger">Peringatan Sistem</h3>
            <span class="dash-badge-danger">{{ summary.systemAlerts.length }} Galat Notifikasi</span>
          </div>
          <div class="dash-alerts-list">
            <div v-for="alert in summary.systemAlerts" :key="alert.id" class="dash-alert-item">
              <span class="dash-alert-dot" />
              <div class="dash-alert-info">
                <span class="dash-alert-title">Gagal kirim surel tiket #{{ alert.tiket }}</span>
                <span class="dash-alert-desc">{{ alert.galat || 'Masalah koneksi SMTP/jaringan' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Live Feed Aktivitas (F3.4) -->
        <div class="dash-card">
          <div class="dash-card-head">
            <div>
              <h3 class="dash-card-title">Live Feed Aktivitas</h3>
              <p class="dash-card-desc">Catatan aksi moderasi dan operasional</p>
            </div>
            <RouterLink v-if="canViewAudit" to="/admin/audit" class="dash-card-link">
              Log Lengkap →
            </RouterLink>
          </div>

          <!-- Loading state -->
          <div v-if="loading && !dataLoaded" class="dash-feed-loading">
            <SkeletonBlock v-for="i in 5" :key="i" height="48px" radius="6px" class="dash-skeleton-row" />
          </div>

          <!-- Empty feed -->
          <div v-else-if="!summary.recentAudit.length" class="dash-empty-state">
            <p>{{ canViewAudit ? 'Belum ada aktivitas tercatat.' : 'Akses log audit dibatasi untuk peran Administrator dan Peninjau.' }}</p>
          </div>

          <!-- Feed List -->
          <div v-else class="dash-feed-list">
            <div v-for="item in summary.recentAudit" :key="item.id" class="dash-feed-item">
              <div class="dash-feed-left">
                <span class="dash-feed-dot" :class="actionDotClass(item.aksi)" />
                <div class="dash-feed-text">
                  <div class="dash-feed-main">
                    <strong class="dash-actor">{{ item.aktor_nama || 'Sistem' }}</strong>
                    <span class="dash-action-chip" :class="actionChipClass(item.aksi)">
                      {{ actionLabel(item.aksi) }}
                    </span>
                  </div>
                  <span v-if="item.target_id" class="dash-target">
                    Target: <code>{{ item.target_id }}</code>
                  </span>
                </div>
              </div>
              <time class="dash-feed-time">{{ formatRelative(item.waktu) }}</time>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { adminDashboardApi } from '@/services/api/admin-dashboard.api'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import {
  STATUS_BADGE,
  KATEGORI_LABELS,
  reportAge,
} from '@/features/admin/config/reports'

const auth = useAuthStore()

const loading = ref(true)
const dataLoaded = ref(false)
const error = ref('')

const summary = ref({
  kpi: {
    totalReports: 0,
    waitingVerification: 0,
    totalByStatus: {},
    etlErrorsTotal: null,
    unmatchedTotal: null,
  },
  projectStats: {
    total_proyek: 0,
    kategori: { Rendah: 0, 'Perlu Perhatian': 0, Tinggi: 0 },
    rata_rata_skor: null,
  },
  dailyTrend: [],
  queueReports: [],
  recentAudit: [],
  systemAlerts: [],
})

const isAdmin = computed(() => auth.user?.peran === 'admin')
const canViewAudit = computed(() => ['admin', 'peninjau'].includes(auth.user?.peran))

const hoveredTrendIndex = ref(null)

const trendTotals = computed(() => {
  const trend = summary.value.dailyTrend || []
  return trend.reduce(
    (acc, item) => {
      acc.total_masuk += Number(item.total_masuk) || 0
      acc.diverifikasi += Number(item.diverifikasi) || 0
      acc.selesai += Number(item.selesai) || 0
      return acc
    },
    { total_masuk: 0, diverifikasi: 0, selesai: 0 }
  )
})

const chartConfig = computed(() => {
  const width = 680
  const height = 230
  const padLeft = 36
  const padRight = 16
  const padTop = 20
  const padBottom = 34
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const trend = summary.value.dailyTrend || []
  const count = Math.max(trend.length, 1)

  let maxVal = 1
  for (const item of trend) {
    const m = Math.max(
      Number(item.total_masuk) || 0,
      Number(item.diverifikasi) || 0,
      Number(item.selesai) || 0
    )
    if (m > maxVal) maxVal = m
  }

  const yTicksCount = 4
  const step = Math.max(1, Math.ceil(maxVal / yTicksCount))
  const maxY = step * yTicksCount

  const slotW = plotW / count
  const barW = Math.max(4, Math.min(8, (slotW - 12) / 3))
  const barGap = 2
  const groupW = barW * 3 + barGap * 2
  const groupOffset = (slotW - groupW) / 2

  const bars = trend.map((item, idx) => {
    const slotX = padLeft + idx * slotW
    const groupX = slotX + groupOffset

    const hMasuk = ((Number(item.total_masuk) || 0) / maxY) * plotH
    const hVerif = ((Number(item.diverifikasi) || 0) / maxY) * plotH
    const hSelesai = ((Number(item.selesai) || 0) / maxY) * plotH

    return {
      index: idx,
      tanggal: item.tanggal,
      slotX,
      slotW,
      groupX,
      bars: [
        {
          key: 'masuk',
          val: Number(item.total_masuk) || 0,
          x: groupX,
          y: padTop + (plotH - hMasuk),
          w: barW,
          h: Math.max(0, hMasuk),
        },
        {
          key: 'verif',
          val: Number(item.diverifikasi) || 0,
          x: groupX + barW + barGap,
          y: padTop + (plotH - hVerif),
          w: barW,
          h: Math.max(0, hVerif),
        },
        {
          key: 'selesai',
          val: Number(item.selesai) || 0,
          x: groupX + (barW + barGap) * 2,
          y: padTop + (plotH - hSelesai),
          w: barW,
          h: Math.max(0, hSelesai),
        },
      ],
    }
  })

  const yTicks = []
  for (let i = 0; i <= yTicksCount; i++) {
    const val = step * i
    const yPos = padTop + plotH - (val / maxY) * plotH
    yTicks.push({ val, y: yPos })
  }

  return {
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    plotW,
    plotH,
    maxY,
    yTicks,
    bars,
  }
})

const tooltipPositionStyle = computed(() => {
  if (hoveredTrendIndex.value === null) return {}
  const bar = chartConfig.value.bars[hoveredTrendIndex.value]
  if (!bar) return {}
  const pct = ((bar.slotX + bar.slotW / 2) / chartConfig.value.width) * 100
  // Jika di 20% awal atau 20% akhir, sesuaikan transform agar tidak meluap keluar container
  const translate = pct < 20 ? '0%' : pct > 80 ? '-100%' : '-50%'
  return {
    left: `${pct}%`,
    transform: `translateX(${translate})`,
  }
})

function formatTrendDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`
  }
  return dateStr
}

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
})

function kategoriLabel(kategori) {
  if (!kategori) return '—'
  return KATEGORI_LABELS[kategori] || kategori
}

function badgeStyle(status) {
  const cfg = STATUS_BADGE[status] || { text: 'var(--c-muted)', bg: 'var(--c-bg)' }
  return { color: cfg.text, backgroundColor: cfg.bg }
}

function formatRelative(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Baru saja'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} mnt lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function actionLabel(aksi) {
  const map = {
    VERIFY_REPORT: 'Verifikasi Laporan',
    REJECT_REPORT: 'Tolak Laporan',
    FORWARD_AGENCY: 'Teruskan Lembaga',
    UPDATE_STATUS: 'Pembaruan Status',
    SYNC_SOURCE: 'Sinkronisasi ETL',
    MATCH_DECISION: 'Keputusan Pencocokan',
  }
  return map[aksi] || aksi || 'Aktivitas'
}

function actionDotClass(aksi) {
  if (aksi === 'VERIFY_REPORT') return 'is-success'
  if (aksi === 'REJECT_REPORT') return 'is-danger'
  if (aksi === 'FORWARD_AGENCY') return 'is-info'
  if (aksi === 'SYNC_SOURCE' || aksi === 'MATCH_DECISION') return 'is-warning'
  return 'is-default'
}

function actionChipClass(aksi) {
  if (aksi === 'VERIFY_REPORT') return 'chip-success'
  if (aksi === 'REJECT_REPORT') return 'chip-danger'
  if (aksi === 'FORWARD_AGENCY') return 'chip-info'
  if (aksi === 'SYNC_SOURCE' || aksi === 'MATCH_DECISION') return 'chip-warning'
  return 'chip-default'
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await adminDashboardApi.getSummary(auth.user?.peran)
    summary.value = res
    dataLoaded.value = true
  } catch (err) {
    error.value = err.message || 'Gagal memuat ringkasan operasional'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  max-width: 1400px;
}

/* Header & Status Bar */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
  padding-bottom: var(--sp-3);
  border-bottom: var(--bw) solid var(--c-border);
}
.dash-title {
  font-size: var(--fs-2xl);
  font-weight: 800;
  color: var(--c-ink);
  margin: 0 0 4px 0;
}
.dash-subtitle {
  font-size: var(--fs-sm);
  color: var(--c-muted);
  margin: 0;
}
.dash-header-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.dash-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-sm);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.dash-refresh-btn:hover:not(:disabled) {
  background: var(--c-bg);
  color: var(--c-ink);
}

/* Alerts */
.dash-alert {
  padding: 12px 16px;
  border-radius: var(--r-md);
  font-size: var(--fs-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dash-alert--danger {
  background: var(--c-danger-soft);
  color: var(--c-danger);
  border: 1px solid rgba(214, 58, 31, 0.2);
}
.dash-btn-retry {
  background: none;
  border: 1px solid var(--c-danger);
  color: var(--c-danger);
  border-radius: var(--r-xs);
  padding: 4px 8px;
  font-size: var(--fs-xs);
  cursor: pointer;
}

/* KPI Cards Grid */
.dash-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sp-4);
}
.dash-kpi-card {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-lg);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--sp-2);
}
.dash-kpi-label {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-muted);
}
.dash-kpi-val-wrap {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}
.dash-kpi-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--c-ink);
  line-height: 1.1;
}
.dash-kpi-value.text-warning { color: var(--c-warning); }
.dash-kpi-value.text-danger { color: var(--c-danger); }

.dash-kpi-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-xs);
  color: var(--c-subtle);
}
.dash-kpi-pill {
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--r-pill);
}
.dash-kpi-pill.is-info { background: var(--c-info-soft); color: var(--c-info); }
.dash-kpi-pill.is-warning { background: var(--c-warning-soft); color: var(--c-warning); }
.dash-kpi-pill.is-danger { background: var(--c-danger-soft); color: var(--c-danger); }
.dash-kpi-pill.is-subtle { background: var(--c-bg); color: var(--c-muted); }

/* KPI Stats Card (Full-Width Banner) */
.dash-kpi-card--stats {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: 16px 20px;
}
.dash-stats-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 220px;
}
.dash-stats-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dash-stats-count-tag {
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  background: var(--c-bg-alt);
  color: var(--c-muted);
  border: var(--bw) solid var(--c-border);
}
.dash-stats-hint {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--c-subtle);
}
.dash-stats-center {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dash-risk-distribution {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.dash-risk-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--r-md);
  font-size: var(--fs-xs);
}
.dash-risk-item.is-high { background: var(--c-danger-soft); color: var(--c-danger); }
.dash-risk-item.is-medium { background: var(--c-warning-soft); color: var(--c-warning); }
.dash-risk-item.is-low { background: var(--c-success-soft); color: var(--c-success); }
.dash-risk-badge { font-weight: 600; }
.dash-risk-count { font-weight: 800; font-size: var(--fs-sm); }

.dash-stats-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 140px;
}
.dash-stats-score-label {
  font-size: var(--fs-micro);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--c-muted);
}
.dash-stats-score-box {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.dash-stats-score-val {
  font-size: 22px;
  font-weight: 800;
  color: var(--c-ink);
  line-height: 1;
}
.dash-stats-score-max {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-subtle);
}

/* Main Grid Layout */
.dash-main-grid {
  display: grid;
  grid-template-columns: 7fr 5fr;
  gap: var(--sp-5);
  align-items: start;
}
.dash-left-col,
.dash-right-col {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  min-width: 0;
}

/* Card Container */
.dash-card {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-lg);
  padding: 20px;
}
.dash-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}
.dash-card-title {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-ink);
  margin: 0;
}
.dash-card-desc {
  font-size: var(--fs-xs);
  color: var(--c-muted);
  margin: 2px 0 0 0;
}
.dash-card-link {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-primary);
  text-decoration: none;
  white-space: nowrap;
}
.dash-card-link:hover { text-decoration: underline; }

/* Tren Chart (Fase 29) */
.dash-card--trend {
  position: relative;
}
.dash-trend-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.dash-trend-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-muted);
  background: var(--c-bg);
  padding: 4px 10px;
  border-radius: var(--r-full);
  border: 1px solid var(--c-border);
}
.dash-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.dot-masuk {
  background-color: var(--c-primary);
}
.dot-verif {
  background-color: var(--c-warning);
}
.dot-selesai {
  background-color: var(--c-success);
}

.dash-chart-container {
  position: relative;
  width: 100%;
  margin-top: 12px;
  background: var(--c-bg-subtle, var(--c-bg));
  border-radius: var(--r-md);
  padding: 10px 4px 6px 4px;
}
.dash-trend-svg {
  width: 100%;
  height: auto;
  max-height: 240px;
  display: block;
  overflow: visible;
}

.dash-grid-line {
  stroke: var(--c-border);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}
.dash-axis-label {
  font-size: 10px;
  font-family: inherit;
  fill: var(--c-muted);
  user-select: none;
}
.dash-axis-label.text-x {
  font-weight: 500;
}
.dash-axis-label.text-y {
  font-weight: 600;
}

.dash-slot-hitbox {
  fill: transparent;
  cursor: pointer;
  transition: fill 0.15s ease;
}
.dash-day-group:hover .dash-slot-hitbox,
.dash-day-group.is-active .dash-slot-hitbox {
  fill: rgba(0, 0, 0, 0.04);
}

.dash-bar {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.dash-day-group:hover .dash-bar {
  filter: brightness(0.95);
}
.bar-masuk {
  fill: var(--c-primary);
}
.bar-verif {
  fill: var(--c-warning);
}
.bar-selesai {
  fill: var(--c-success);
}
.dash-bar.is-empty {
  fill: var(--c-border);
  opacity: 0.5;
}

/* Tooltip Interaktif */
.dash-trend-tooltip {
  position: absolute;
  top: 14px;
  z-index: 20;
  pointer-events: none;
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--r-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 8px 12px;
  min-width: 140px;
  white-space: nowrap;
}
.dash-tt-head {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-ink);
  border-bottom: 1px solid var(--c-border);
  padding-bottom: 4px;
  margin-bottom: 6px;
}
.dash-tt-metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dash-tt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}
.dash-tt-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
  display: inline-block;
  margin-right: -6px;
}
.dash-tt-name {
  flex: 1;
  text-align: left;
}
.dash-tt-val {
  font-weight: 700;
  color: var(--c-ink);
}

.dash-tt-fade-enter-active,
.dash-tt-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dash-tt-fade-enter-from,
.dash-tt-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* Table */
.dash-table-wrap {
  overflow-x: auto;
  margin: 0 -20px -20px -20px;
}
.dash-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-xs);
}
.dash-table th {
  background: var(--c-bg-alt);
  color: var(--c-muted);
  font-size: var(--fs-micro);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 16px;
  text-align: left;
  border-bottom: var(--bw) solid var(--c-border);
}
.dash-table td {
  padding: 12px 16px;
  border-bottom: var(--bw) solid var(--c-border);
  color: var(--c-ink);
  vertical-align: middle;
}
.dash-table tr:last-child td {
  border-bottom: none;
}
.cell-tiket {
  font-family: monospace;
  font-weight: 700;
  color: var(--c-primary-text);
  white-space: nowrap;
}
.cell-proyek {
  max-width: 220px;
}
.cell-proyek-name {
  display: block;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-proyek-loc {
  display: block;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}
.cell-cat {
  white-space: nowrap;
  color: var(--c-muted);
}
.cell-umur {
  white-space: nowrap;
  color: var(--c-muted);
}
.dash-badge {
  display: inline-block;
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  white-space: nowrap;
}
.dash-btn-action {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-primary);
  text-decoration: none;
  white-space: nowrap;
}
.dash-btn-action:hover {
  text-decoration: underline;
}

/* Live Feed */
.dash-feed-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.dash-feed-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: 10px 12px;
  background: var(--c-bg-alt);
  border-radius: var(--r-md);
}
.dash-feed-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}
.dash-feed-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  margin-top: 5px;
}
.dash-feed-dot.is-success { background: var(--c-success); }
.dash-feed-dot.is-danger { background: var(--c-danger); }
.dash-feed-dot.is-info { background: var(--c-info); }
.dash-feed-dot.is-warning { background: var(--c-warning); }
.dash-feed-dot.is-default { background: var(--c-subtle); }

.dash-feed-text {
  min-width: 0;
}
.dash-feed-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: var(--fs-xs);
}
.dash-actor {
  font-weight: 700;
  color: var(--c-ink);
}
.dash-action-chip {
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--r-pill);
}
.dash-action-chip.chip-success { background: var(--c-success-soft); color: var(--c-success); }
.dash-action-chip.chip-danger { background: var(--c-danger-soft); color: var(--c-danger); }
.dash-action-chip.chip-info { background: var(--c-info-soft); color: var(--c-info); }
.dash-action-chip.chip-warning { background: var(--c-warning-soft); color: var(--c-warning); }
.dash-action-chip.chip-default { background: var(--c-bg); color: var(--c-muted); }

.dash-target {
  display: block;
  font-size: var(--fs-micro);
  color: var(--c-muted);
  margin-top: 2px;
}
.dash-target code {
  font-family: monospace;
  background: var(--c-bg);
  padding: 1px 4px;
  border-radius: var(--r-xs);
}
.dash-feed-time {
  font-size: var(--fs-micro);
  color: var(--c-subtle);
  white-space: nowrap;
  flex: none;
}

/* Alerts Card */
.is-alert-card {
  border-color: rgba(214, 58, 31, 0.3);
}
.dash-badge-danger {
  font-size: var(--fs-micro);
  font-weight: 700;
  background: var(--c-danger-soft);
  color: var(--c-danger);
  padding: 2px 8px;
  border-radius: var(--r-pill);
}
.dash-alerts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dash-alert-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: var(--c-danger-soft);
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
}
.dash-alert-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-danger);
  margin-top: 5px;
  flex: none;
}
.dash-alert-title {
  display: block;
  font-weight: 700;
  color: var(--c-danger);
}
.dash-alert-desc {
  display: block;
  font-size: var(--fs-micro);
  color: var(--c-ink);
}

.dash-empty-state {
  padding: 32px 16px;
  text-align: center;
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.dash-skeleton-row {
  margin-bottom: 8px;
}

/* Responsiveness */
@media (max-width: 1024px) {
  .dash-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dash-kpi-card--stats {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .dash-stats-center {
    width: 100%;
  }
  .dash-risk-distribution {
    width: 100%;
    flex-wrap: wrap;
  }
  .dash-risk-item {
    flex: 1 1 auto;
    justify-content: center;
  }
  .dash-stats-right {
    align-items: flex-start;
    padding-top: 8px;
    border-top: var(--bw) dashed var(--c-border);
  }
}

@media (max-width: 640px) {
  .dash-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .dash-header-actions {
    width: 100%;
  }
  .dash-refresh-btn {
    width: 100%;
    justify-content: center;
  }
  .dash-kpi-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .dash-chart-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
