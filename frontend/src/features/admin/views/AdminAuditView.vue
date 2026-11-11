<template>
  <div class="admin-audit-page">

    <!-- Topbar / Header -->
    <header class="audit-head">
      <div class="audit-title-group">
        <h1 class="audit-title">
          Log Audit Sistem Permanen
        </h1>
      </div>
    </header>

    <!-- Subheader Tabs (Pill Tab Bar Konsisten dengan Daftar Proyek & Laporan) -->
    <nav class="audit-tabs-bar" aria-label="Tab kategori modul audit">
      <div class="tabs-list">
        <button
          v-for="tab in auditTabs"
          :key="tab.value"
          class="tab-item"
          :class="{ 'is-active': activeTab === tab.value }"
          @click="switchTab(tab.value)"
        >
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 4 KPI Cards (Ringkasan Eksekutif Rekam Jejak Audit) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">TOTAL EVENT AUDIT</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="70px" radius="6px" />
          <span v-else class="kpi-val">{{ kpiSummary.total.toLocaleString('id-ID') }} Event</span>
        </div>
        <span class="kpi-sub">Append-only di basis data terproteksi</span>
      </div>

      <div class="kpi-card kpi-card--warning">
        <span class="kpi-label">MODERASI LAPORAN</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="60px" radius="6px" />
          <span v-else class="kpi-val text-warning">{{ kpiSummary.moderasi.toLocaleString('id-ID') }} Event</span>
        </div>
        <span class="kpi-sub">Verifikasi, eskalasi &amp; tolak laporan</span>
      </div>

      <div class="kpi-card kpi-card--success">
        <span class="kpi-label">SINKRONISASI PIPA ETL</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="60px" radius="6px" />
          <span v-else class="kpi-val text-success">{{ kpiSummary.etl.toLocaleString('id-ID') }} Event</span>
        </div>
        <span class="kpi-sub">Integritas data SiRUP &amp; SPSE</span>
      </div>

      <div class="kpi-card kpi-card--teal">
        <span class="kpi-label">AKSES &amp; OTORISASI (RBAC)</span>
        <div class="kpi-val-row">
          <span class="kpi-val text-teal">RBAC Ditegakkan</span>
        </div>
        <span class="kpi-sub">Akses khusus Admin &amp; Peninjau</span>
      </div>
    </div>

    <!-- Alert Notifikasi Galat -->
    <div v-if="error" class="alert-banner alert-banner--danger">
      <div class="alert-left">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="alert-icon">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button class="alert-btn-retry" @click="fetchLogs">Coba Lagi</button>
    </div>

    <!-- Kartu Filter Toolbar Mandiri (2 Baris Sesuai Mockup) -->
    <div class="audit-filter-card">
      <div class="filter-row-top">
        <div class="search-box">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" />
            <line x1="9.5" y1="9.5" x2="13" y2="13" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari aktor, modul, ID target, aksi, atau IP address..."
            aria-label="Pencarian rekam jejak audit"
          />
          <button v-if="searchQuery" class="search-clear-btn" aria-label="Hapus pencarian" @click="searchQuery = ''">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <select v-model="filterModul" class="filter-select" aria-label="Filter modul audit" @change="handleModuleChange">
          <option value="">Semua Modul Audit</option>
          <option v-for="mod in AUDIT_MODULES" :key="mod.value" :value="mod.value">
            {{ mod.selectLabel }}
          </option>
        </select>

        <div class="date-input-group">
          <label class="date-lbl">Dari:</label>
          <input
            v-model="filterStartDate"
            type="date"
            class="filter-date-input"
            aria-label="Filter tanggal awal"
            :max="filterEndDate || undefined"
            @change="handleDateChange('start')"
          />
        </div>

        <div class="date-input-group">
          <label class="date-lbl">Sampai:</label>
          <input
            v-model="filterEndDate"
            type="date"
            class="filter-date-input"
            aria-label="Filter tanggal akhir"
            :min="filterStartDate || undefined"
            @change="handleDateChange('end')"
          />
        </div>
      </div>

      <div class="filter-row-bottom">
        <div class="filter-chips-group">
          <button
            class="chip-filter"
            :class="{ 'is-active': activeRange === 'today' }"
            @click="setQuickRange('today')"
          >
            <span class="chip-dot">●</span>
            <span>Hari Ini</span>
          </button>
          <button
            class="chip-filter"
            :class="{ 'is-active': activeRange === '7d' }"
            @click="setQuickRange('7d')"
          >
            <span class="chip-dot">●</span>
            <span>7 Hari Terakhir</span>
          </button>
          <button
            class="chip-filter"
            :class="{ 'is-active': activeRange === '30d' }"
            @click="setQuickRange('30d')"
          >
            <span class="chip-dot">●</span>
            <span>30 Hari Terakhir</span>
          </button>
        </div>

        <div class="filter-right-actions">
          <button class="btn-refresh" :disabled="loading" @click="refreshAuditView">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'spin-icon': loading }">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>↻ Segarkan</span>
          </button>
          <span class="audit-counter">
            {{ counterSummary }}
          </span>
        </div>
      </div>
    </div>

    <!-- Kartu Tabel Mandiri (Radius 16px, Overflow Hidden) -->
    <div class="audit-table-card">
      <!-- Loading Skeleton State -->
      <div v-if="loading && !dataLoaded" class="table-loading-wrap">
        <div v-for="i in 8" :key="i" class="skeleton-row-item">
          <SkeletonBlock height="16px" width="120px" radius="4px" />
          <SkeletonBlock height="16px" width="160px" radius="4px" />
          <SkeletonBlock height="16px" width="100px" radius="4px" />
          <SkeletonBlock height="16px" width="110px" radius="4px" />
          <SkeletonBlock height="16px" width="200px" radius="4px" />
          <SkeletonBlock height="16px" width="90px" radius="4px" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!filteredLogs.length" class="audit-empty-wrap">
        <div class="empty-icon-wrap">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 class="empty-title">Tidak Ada Catatan Audit</h3>
        <p class="empty-desc">Tidak ditemukan event audit yang cocok dengan filter atau kata kunci pencarian Anda saat ini.</p>
        <button class="btn-reset-filter" @click="resetFilters">Reset Filter</button>
      </div>

      <!-- Tabel Data Audit -->
      <div v-else class="table-container">
        <table class="audit-table">
          <thead>
            <tr>
              <th scope="col" style="width: 170px;">WAKTU (WIB)</th>
              <th scope="col" style="width: 190px;">AKTOR &amp; PERAN</th>
              <th scope="col" style="width: 140px;">MODUL</th>
              <th scope="col" style="width: 170px;">AKSI / EVENT</th>
              <th scope="col">RINCIAN PERUBAHAN (DIFF)</th>
              <th scope="col" style="width: 120px;">IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredLogs" :key="row.id">
              <!-- Kolom 1: Waktu -->
              <td class="cell-time">
                <span class="cell-time-main">{{ formatWib(row.waktu) }}</span>
                <span v-if="formatRelativeTime(row.waktu)" class="cell-time-rel">
                  {{ formatRelativeTime(row.waktu) }}
                </span>
              </td>

              <!-- Kolom 2: Aktor & Peran -->
              <td class="cell-actor">
                <div class="actor-wrap">
                  <span class="actor-avatar" :class="getAvatarClass(row.peran)">
                    {{ getInitials(row.aktor_nama) }}
                  </span>
                  <div class="actor-info">
                    <strong class="actor-name">{{ row.aktor_nama || 'Sistem Otomatis' }}</strong>
                    <span class="actor-role-badge" :class="getRoleClass(row.peran)">
                      {{ row.peran || 'system' }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- Kolom 3: Modul -->
              <td class="cell-modul">
                <span class="modul-badge">{{ formatModul(row.modul) }}</span>
              </td>

              <!-- Kolom 4: Aksi / Event -->
              <td class="cell-action">
                <span class="action-badge" :class="actionClass(row.aksi)">
                  {{ row.aksi }}
                </span>
                <span v-if="row.target_id" class="target-tag" :title="row.target_id">
                  Target: {{ formatTarget(row.target_id) }}
                </span>
              </td>

              <!-- Kolom 5: Rincian Diff -->
              <td class="cell-diff">
                <AuditDiffViewer :diff="row.diff" />
              </td>

              <!-- Kolom 6: IP Address -->
              <td class="cell-ip">
                <code class="ip-code">{{ row.ip || '—' }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Paginasi Mandiri -->
      <footer class="audit-footer">
        <span class="pagination-info">
          {{ counterSummary }}
        </span>

        <div class="pagination-controls">
          <button
            class="btn-page"
            :disabled="offset === 0 || loading"
            @click="changePage(-1)"
          >
            Sebelumnya
          </button>
          <span class="page-current">Hal {{ currentPage }} / {{ totalPages || 1 }}</span>
          <button
            class="btn-page"
            :disabled="offset + limit >= total || loading"
            @click="changePage(1)"
          >
            Berikutnya
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminAuditApi } from '@/services/api/admin-audit.api'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import AuditDiffViewer from '@/features/admin/components/AuditDiffViewer.vue'

// Konfigurasi modul tunggal agar selaras dengan modul aktual backend
const AUDIT_MODULES = [
  {
    value: 'moderasi',
    tabLabel: 'Moderasi Laporan',
    selectLabel: 'Moderasi Laporan Warga',
    badgeLabel: 'Moderasi Laporan',
  },
  {
    value: 'etl',
    tabLabel: 'Pipa ETL & Pencocokan',
    selectLabel: 'Pipa ETL & Pencocokan Paket',
    badgeLabel: 'Pipa ETL',
  },
  {
    value: 'proyek',
    tabLabel: 'Kelola Proyek & RAB',
    selectLabel: 'Kelola Proyek, Tender & RAB',
    badgeLabel: 'Kelola Proyek',
  },
  {
    value: 'notifikasi',
    tabLabel: 'Notifikasi Pelapor',
    selectLabel: 'Notifikasi & Retensi Kontak',
    badgeLabel: 'Notifikasi',
  },
  {
    value: 'rekap',
    tabLabel: 'Rekap Cetak',
    selectLabel: 'Rekapitulasi Cetak',
    badgeLabel: 'Rekap Cetak',
  },
]

const MODULE_LABEL_MAP = Object.fromEntries(
  AUDIT_MODULES.map((mod) => [mod.value, mod.badgeLabel]),
)

const auditTabs = [
  { value: '', label: 'Semua Aktivitas' },
  ...AUDIT_MODULES.map((mod) => ({ value: mod.value, label: mod.tabLabel })),
]

// State
const loading = ref(true)
const dataLoaded = ref(false)
const error = ref('')

const logs = ref([])
const total = ref(0)
const limit = ref(100)
const offset = ref(0)

const kpiSummary = ref({
  total: 0,
  moderasi: 0,
  etl: 0,
})

const activeTab = ref('')
const filterModul = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')
const searchQuery = ref('')
const activeRange = ref('')

let latestRequestId = 0

function switchTab(modulVal) {
  activeTab.value = modulVal
  filterModul.value = modulVal
  handleModuleChange()
}

// Pagination
const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

// Filtered Logs (client-side pada halaman termuat)
const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0)

const filteredLogs = computed(() => {
  if (!hasSearchQuery.value) return logs.value
  const q = searchQuery.value.toLowerCase().trim()
  return logs.value.filter((row) => {
    const modulLabel = formatModul(row.modul).toLowerCase()
    const diffText = row.diff ? JSON.stringify(row.diff).toLowerCase() : ''
    return (
      (row.aktor_nama && row.aktor_nama.toLowerCase().includes(q)) ||
      (row.target_id && row.target_id.toLowerCase().includes(q)) ||
      (row.aksi && row.aksi.toLowerCase().includes(q)) ||
      (row.ip && row.ip.toLowerCase().includes(q)) ||
      (row.peran && row.peran.toLowerCase().includes(q)) ||
      (row.modul && row.modul.toLowerCase().includes(q)) ||
      modulLabel.includes(q) ||
      diffText.includes(q)
    )
  })
})

const counterSummary = computed(() => {
  if (hasSearchQuery.value) {
    const base = `${filteredLogs.value.length} cocok dari ${logs.value.length} event pada halaman ini`
    if (total.value > logs.value.length) {
      return `${base} (total ${total.value.toLocaleString('id-ID')} event terfilter)`
    }
    return base
  }
  const start = total.value ? offset.value + 1 : 0
  const end = Math.min(offset.value + logs.value.length, total.value)
  return `Menampilkan ${start}–${end} dari ${total.value.toLocaleString('id-ID')} event`
})

// Format Helpers
function formatWib(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date) + ' WIB'
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Baru saja'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} mnt lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} hari lalu`
}

function getInitials(name) {
  if (!name) return 'SYS'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function isReviewerRole(peran) {
  return peran === 'peninjau' || peran === 'verifikator'
}

function getAvatarClass(peran) {
  if (peran === 'admin') return 'avatar--admin'
  if (isReviewerRole(peran)) return 'avatar--verifikator'
  return 'avatar--system'
}

function getRoleClass(peran) {
  if (peran === 'admin') return 'role--admin'
  if (isReviewerRole(peran)) return 'role--verifikator'
  return 'role--system'
}

function formatModul(modul) {
  return MODULE_LABEL_MAP[modul] || modul || 'Sistem'
}

function actionClass(aksi) {
  if (!aksi) return 'badge-subtle'
  if (aksi.includes('VERIFY') || aksi.includes('CREATE')) return 'badge-success'
  if (aksi.includes('REJECT') || aksi.includes('FAIL') || aksi.includes('DELETE')) return 'badge-danger'
  if (aksi.includes('FORWARD') || aksi.includes('UPDATE') || aksi.includes('PRINT')) return 'badge-info'
  if (aksi.includes('SYNC') || aksi.includes('MATCH') || aksi.includes('RETRY')) return 'badge-warning'
  return 'badge-subtle'
}

function formatTarget(targetId) {
  if (!targetId) return ''
  if (targetId.length > 18) {
    return targetId.slice(0, 8) + '…' + targetId.slice(-6)
  }
  return targetId
}

function formatLocalYmd(date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function addLocalDays(baseDate, deltaDays) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + deltaDays)
}

async function fetchKpiSummary(unfilteredTotal = null) {
  const [totalRes, moderasiRes, etlRes] = await Promise.allSettled([
    unfilteredTotal !== null
      ? Promise.resolve({ total: unfilteredTotal })
      : adminAuditApi.list({ limit: 1 }),
    adminAuditApi.list({ modul: 'moderasi', limit: 1 }),
    adminAuditApi.list({ modul: 'etl', limit: 1 }),
  ])

  kpiSummary.value = {
    total: totalRes.status === 'fulfilled' ? totalRes.value.total : kpiSummary.value.total,
    moderasi: moderasiRes.status === 'fulfilled' ? moderasiRes.value.total : kpiSummary.value.moderasi,
    etl: etlRes.status === 'fulfilled' ? etlRes.value.total : kpiSummary.value.etl,
  }
}

// Fetch Logs
async function fetchLogs() {
  const requestId = ++latestRequestId
  loading.value = true
  error.value = ''
  try {
    const params = {
      limit: limit.value,
      offset: offset.value,
    }
    if (filterModul.value) params.modul = filterModul.value
    if (filterStartDate.value) params.start_date = filterStartDate.value
    if (filterEndDate.value) params.end_date = filterEndDate.value

    const res = await adminAuditApi.list(params)
    if (requestId !== latestRequestId) return
    logs.value = res.logs
    total.value = res.total
    limit.value = res.limit
    offset.value = res.offset
    dataLoaded.value = true
  } catch (err) {
    if (requestId !== latestRequestId) return
    error.value = err.message || 'Gagal memuat log audit'
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function refreshAuditView() {
  await fetchLogs()
  const hasFilter = Boolean(filterModul.value || filterStartDate.value || filterEndDate.value)
  await fetchKpiSummary(hasFilter ? null : total.value)
}

function handleModuleChange() {
  activeTab.value = filterModul.value
  offset.value = 0
  fetchLogs()
}

function handleDateChange(changedBound) {
  activeRange.value = ''
  if (filterStartDate.value && filterEndDate.value && filterStartDate.value > filterEndDate.value) {
    if (changedBound === 'start') {
      filterEndDate.value = filterStartDate.value
    } else {
      filterStartDate.value = filterEndDate.value
    }
  }
  offset.value = 0
  fetchLogs()
}

function setQuickRange(range) {
  if (activeRange.value === range) {
    activeRange.value = ''
    filterStartDate.value = ''
    filterEndDate.value = ''
    offset.value = 0
    fetchLogs()
    return
  }

  activeRange.value = range
  const now = new Date()
  filterEndDate.value = formatLocalYmd(now)

  if (range === 'today') {
    filterStartDate.value = formatLocalYmd(now)
  } else if (range === '7d') {
    filterStartDate.value = formatLocalYmd(addLocalDays(now, -7))
  } else if (range === '30d') {
    filterStartDate.value = formatLocalYmd(addLocalDays(now, -30))
  }

  offset.value = 0
  fetchLogs()
}

function resetFilters() {
  searchQuery.value = ''
  filterModul.value = ''
  activeTab.value = ''
  filterStartDate.value = ''
  filterEndDate.value = ''
  activeRange.value = ''
  offset.value = 0
  fetchLogs()
}

function changePage(direction) {
  const newOffset = offset.value + direction * limit.value
  if (newOffset >= 0 && newOffset < total.value) {
    offset.value = newOffset
    fetchLogs()
  }
}

onMounted(async () => {
  await fetchLogs()
  if (!error.value) {
    await fetchKpiSummary(total.value)
  }
})
</script>

<style scoped>
.admin-audit-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* Breadcrumb Tag */
.audit-breadcrumb-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  padding: 4px 12px;
  border-radius: 999px;
  width: fit-content;
}

.audit-breadcrumb-tag .dot-orange {
  color: #ff5c00;
  font-size: 12px;
}

/* Header */
.audit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.audit-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.audit-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--c-ink, #111111);
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.audit-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--c-muted, #6B6760);
  letter-spacing: 0;
}

.sync-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #059669;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* Subheader Tabs Bar */
.audit-tabs-bar {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 12px;
  padding: 4px 8px;
  overflow-x: auto;
}

.tabs-list {
  display: flex;
  gap: 4px;
  min-width: max-content;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-item:hover {
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
}

.tab-item.is-active {
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
  box-shadow: inset 0 -2px 0 #ff5c00;
}

.tab-count {
  padding: 1px 7px;
  font-size: 10px;
  border-radius: 999px;
  background: #e5e3dc;
  color: #4b5563;
  font-weight: 700;
}

.tab-count--warning {
  background: #fef3c7;
  color: #b45309;
}

.tab-count--success {
  background: #ecfdf5;
  color: #059669;
}

/* 4 KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.kpi-card {
  padding: 16px 18px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 94px;
  transition: border-color 0.15s ease;
}

.kpi-card--warning { border-left: 3.5px solid #d97706; }
.kpi-card--success { border-left: 3.5px solid #16a34a; }
.kpi-card--teal { border-left: 3.5px solid #059669; }

.kpi-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--c-muted, #6B6760);
}

.kpi-val-row {
  min-height: 28px;
  display: flex;
  align-items: baseline;
  margin: 4px 0 2px 0;
}

.kpi-val {
  font-size: 18px;
  font-weight: 800;
  color: var(--c-ink, #111111);
}

.text-warning { color: #d97706; }
.text-success { color: #16a34a; }
.text-teal { color: #059669; }

.kpi-sub {
  font-size: 11px;
  color: var(--c-subtle, #9CA3AF);
  font-weight: 500;
}

/* Alert Banner */
.alert-banner {
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
}

.alert-banner--danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.alert-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-btn-retry {
  background: #ffffff;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  font-size: 11px;
}

/* Kartu Filter Mandiri */
.audit-filter-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 16px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  background: #F8F7F4;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  flex: 1;
  min-width: 260px;
  color: var(--c-muted, #6B6760);
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--c-ink, #111111);
  width: 100%;
}

.search-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--c-muted, #6B6760);
  display: flex;
  padding: 0;
}

.filter-select {
  height: 34px;
  padding: 0 28px 0 12px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--c-ink, #111111);
  background: #F8F7F4;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='%236B6760'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' stroke='%236B6760' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  appearance: none;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  outline: none;
}

.date-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
}

.filter-date-input {
  height: 34px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 11.5px;
  background: #F8F7F4;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  color: var(--c-ink, #111111);
  outline: none;
}

.filter-row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-chips-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chip-filter {
  height: 32px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  background: #F8F7F4;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  color: var(--c-muted, #6B6760);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.chip-filter .chip-dot {
  color: #ff5c00;
  font-size: 9px;
}

.chip-filter.is-active {
  background: #FFFBEB;
  border-color: #F59E0B;
  color: #92400E;
}

.filter-right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-refresh {
  height: 32px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: #FFFFFF;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: #F8F7F4;
}

.audit-counter {
  font-size: 11.5px;
  color: var(--c-muted, #6B6760);
  font-weight: 500;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Standalone Kartu Tabel */
.audit-table-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 16px;
  overflow: hidden;
}

.table-loading-wrap {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skeleton-row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.audit-empty-wrap {
  padding: 60px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #F4F2EE;
  color: #9CA3AF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--c-ink, #111111);
  margin: 0 0 6px 0;
}

.empty-desc {
  font-size: 12px;
  color: var(--c-muted, #6B6760);
  max-width: 380px;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.btn-reset-filter {
  padding: 6px 14px;
  font-size: 11.5px;
  font-weight: 600;
  color: #ff5c00;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  cursor: pointer;
}

/* Tabel */
.table-container {
  overflow-x: auto;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.audit-table thead th {
  background: #FAF8F5;
  color: var(--c-muted, #6B6760);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 12px 18px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
}

.audit-table tbody tr {
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  transition: background 0.1s ease;
}

.audit-table tbody tr:hover {
  background: #FAF8F5;
}

.audit-table tbody tr:last-child {
  border-bottom: none;
}

.audit-table td {
  padding: 12px 18px;
  vertical-align: middle;
}

/* Kolom 1: Waktu */
.cell-time {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cell-time-main {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.cell-time-rel {
  font-size: 10.5px;
  color: var(--c-muted, #6B6760);
}

/* Kolom 2: Aktor & Peran */
.actor-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.actor-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.avatar--admin {
  background: #ffedd5;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.avatar--verifikator {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.avatar--system {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #e5e7eb;
}

.actor-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.actor-name {
  font-size: 11.5px;
  color: var(--c-ink, #111111);
}

.actor-role-badge {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.role--admin { color: #c2410c; }
.role--verifikator { color: #1e40af; }
.role--system { color: #6b7280; }

/* Kolom 3: Modul */
.modul-badge {
  display: inline-block;
  padding: 3px 8px;
  font-size: 10.5px;
  font-weight: 600;
  background: #F4F2EE;
  color: #4b5563;
  border-radius: 6px;
  border: 1px solid #E7E3DC;
}

/* Kolom 4: Aksi */
.cell-action {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
}

.action-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.badge-success {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.badge-danger {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.badge-info {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.badge-warning {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.badge-subtle {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #e5e7eb;
}

.target-tag {
  font-size: 10px;
  font-family: monospace;
  color: var(--c-muted, #6B6760);
  background: #FAF8F5;
  padding: 1px 4px;
  border-radius: 4px;
}

/* Kolom 6: IP */
.ip-code {
  font-family: monospace;
  font-size: 10.5px;
  background: #F4F2EE;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid #E7E3DC;
  color: #4b5563;
}

/* Footer Paginasi */
.audit-footer {
  padding: 12px 20px;
  background: #FAF8F5;
  border-top: 1px solid var(--c-border, #E7E3DC);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 11.5px;
  color: var(--c-muted, #6B6760);
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-page {
  height: 28px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: #FFFFFF;
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-page:hover:not(:disabled) {
  background: #F4F2EE;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-current {
  font-size: 11px;
  font-weight: 600;
  color: var(--c-muted, #6B6760);
  padding: 0 4px;
}

/* Responsiveness */
@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .kpi-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .audit-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .audit-head-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .btn-export-csv,
  .btn-refresh {
    width: 100%;
    justify-content: center;
  }
  .filter-row-top,
  .filter-row-bottom {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-select,
  .filter-date-input,
  .search-box {
    width: 100%;
  }
  .audit-table {
    min-width: 800px;
  }
}
</style>
