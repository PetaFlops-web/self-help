<template>
  <div class="admin-reports-page">
    <!-- Topbar / Header -->
    <header class="reports-head">
      <div class="reports-title-group">
        <h2 class="reports-title">Daftar Laporan Warga</h2>
        <p class="reports-sub">
          {{ formattedToday }} · Total {{ total.toLocaleString('id-ID') }} Laporan Masuk
        </p>
      </div>

      <div class="reports-head-actions">
        <!-- Kotak Cari Cepat -->
        <div class="search-box">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" />
            <path d="M9.5 9.5 13 13" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari tiket, proyek, lokasi..."
            class="search-input"
            @input="handleSearchInput"
          />
        </div>
      </div>
    </header>

    <!-- Subheader Tabs (Status Tabs Bar) -->
    <nav class="reports-tabs-bar" aria-label="Tab status laporan">
      <div class="tabs-list">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-item"
          :class="{ 'is-active': activeStatus === tab.value }"
          @click="switchStatus(tab.value)"
        >
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 5 KPI Cards (Ringkasan Eksekutif) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">TOTAL LAPORAN</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="50px" radius="6px" />
          <span v-else class="kpi-val">{{ totalAllReports }}</span>
        </div>
        <span class="kpi-sub">Laporan temuan warga</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">MENUNGGU VERIFIKASI</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val text-warning">{{ totalByStatus['Dilaporkan'] || 0 }}</span>
        </div>
        <span class="kpi-sub">Perlu audit bukti fisik</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">DIVERIFIKASI</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val text-info">{{ totalByStatus['Diverifikasi'] || 0 }}</span>
        </div>
        <span class="kpi-sub">Siap diteruskan</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">DITERUSKAN</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val text-primary">{{ forwardedCount }}</span>
        </div>
        <span class="kpi-sub">Dalam tindak lanjut APH/SKPD</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">SELESAI</span>
        <div class="kpi-val-row">
          <SkeletonBlock v-if="loading && !dataLoaded" height="26px" width="40px" radius="6px" />
          <span v-else class="kpi-val text-success">{{ totalByStatus['Selesai'] || 0 }}</span>
        </div>
        <span class="kpi-sub">Kasus tuntas</span>
      </div>
    </div>

    <!-- Alert Galat bila terjadi kegagalan -->
    <div v-if="error" class="alert-banner alert-banner--danger">
      <span>{{ error }}</span>
      <button class="alert-close-btn" aria-label="Tutup notifikasi" @click="error = ''">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Container Utama: Filter Bar + Tabel Laporan -->
    <div class="reports-main-card">
      <!-- Filter Bar Lengkap -->
      <div class="reports-filter-bar">
        <div class="filter-controls">
          <!-- Wilayah -->
          <div class="filter-item">
            <select v-model="filterWilayah" class="filter-select" @change="refetch">
              <option value="">Wilayah: Semua Kab/Kota</option>
              <option v-for="w in regionOptions" :key="w.kode_bps" :value="w.kode_bps">
                {{ w.nama }}
              </option>
            </select>
          </div>

          <!-- Kategori -->
          <div class="filter-item">
            <select v-model="filterKategori" class="filter-select" @change="refetch">
              <option v-for="opt in kategoriOptions" :key="opt.value" :value="opt.value">
                {{ opt.value === '' ? 'Kategori: Semua Kategori' : `Kategori: ${opt.label}` }}
              </option>
            </select>
          </div>

          <!-- Chip Filter: Menunggu Verifikasi Saja -->
          <button
            class="chip-filter"
            :class="{ 'is-active': activeStatus === 'Dilaporkan' }"
            @click="toggleWaitingOnly"
          >
            <span class="chip-dot">●</span>
            <span>Menunggu Verifikasi Saja</span>
          </button>
        </div>

        <!-- Tombol Segarkan -->
        <button class="btn-refresh" :disabled="loading" @click="refetch">
          <span>↻ Segarkan</span>
        </button>
      </div>

      <!-- Tabel Laporan Modern (7 Kolom) -->
      <div class="table-container">
        <table class="reports-table">
          <thead>
            <tr>
              <th scope="col" class="th-ticket">KODE TIKET &amp; WAKTU</th>
              <th scope="col" class="th-project">PROYEK TERKAIT</th>
              <th scope="col" class="th-category">KATEGORI LAPORAN</th>
              <th scope="col" class="th-evidence">BUKTI &amp; DETAIL</th>
              <th scope="col" class="th-sla">UMUR SLA</th>
              <th scope="col" class="th-status">STATUS</th>
              <th scope="col" class="th-action">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isTableLoading">
              <tr v-for="n in 5" :key="`skel-${n}`" class="table-row skeleton-row">
                <!-- Kode Tiket & Waktu -->
                <td class="td-ticket">
                  <SkeletonBlock height="15px" width="80px" radius="4px" />
                  <SkeletonBlock height="11px" width="110px" radius="4px" style="margin-top: 5px;" />
                </td>

                <!-- Proyek Terkait -->
                <td class="td-project">
                  <SkeletonBlock height="15px" width="85%" radius="4px" />
                  <SkeletonBlock height="11px" width="50%" radius="4px" style="margin-top: 5px;" />
                </td>

                <!-- Kategori Laporan -->
                <td class="td-category">
                  <SkeletonBlock height="20px" width="95px" radius="4px" />
                </td>

                <!-- Bukti & Detail -->
                <td class="td-evidence">
                  <SkeletonBlock height="14px" width="55px" radius="4px" />
                </td>

                <!-- Umur SLA -->
                <td class="td-sla">
                  <SkeletonBlock height="20px" width="55px" radius="999px" />
                </td>

                <!-- Status -->
                <td class="td-status">
                  <SkeletonBlock height="22px" width="90px" radius="999px" />
                </td>

                <!-- Aksi -->
                <td class="td-action">
                  <SkeletonBlock height="28px" width="65px" radius="6px" />
                </td>
              </tr>
            </template>

            <tr v-else-if="filteredReports.length === 0">
              <td colspan="7" class="td-empty">
                <p class="empty-title">Tidak ada laporan yang sesuai</p>
                <p class="empty-desc">Coba sesuaikan tab status atau bersihkan kata kunci pencarian.</p>
              </td>
            </tr>

            <tr v-for="row in filteredReports" :key="row.tiket" class="table-row">
              <!-- Kode Tiket & Waktu -->
              <td class="td-ticket">
                <RouterLink :to="`/admin/laporan/${row.tiket}`" class="ticket-link">
                  {{ row.tiket }}
                </RouterLink>
                <span class="ticket-date">{{ formatDateTime(row.dibuat_pada) }}</span>
              </td>

              <!-- Proyek Terkait -->
              <td class="td-project">
                <span class="project-name">{{ row.proyek?.nama || '—' }}</span>
                <span v-if="row.proyek?.kabupaten" class="project-loc">{{ row.proyek.kabupaten }}</span>
              </td>

              <!-- Kategori -->
              <td class="td-category">
                <span class="category-badge">{{ kategoriLabel(row.kategori) }}</span>
              </td>

              <!-- Bukti & Detail -->
              <td class="td-evidence">
                <RouterLink :to="`/admin/laporan/${row.tiket}`" class="evidence-link">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  <span>Bukti</span>
                </RouterLink>
              </td>

              <!-- Umur SLA -->
              <td class="td-sla">
                <span class="sla-badge">{{ reportAge(row.dibuat_pada) }}</span>
              </td>

              <!-- Status -->
              <td class="td-status">
                <span class="status-pill" :style="badgeStyle(row.status)">
                  <span class="status-dot">●</span>
                  <span>{{ row.status }}</span>
                </span>
              </td>

              <!-- Aksi -->
              <td class="td-action">
                <RouterLink :to="`/admin/laporan/${row.tiket}`" class="btn-detail">
                  <span>Detail</span>
                  <span class="arrow">→</span>
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <footer class="reports-card-pagination">
        <span class="pagination-info">
          Menampilkan {{ paginationFrom }}–{{ paginationTo }} dari {{ total }} laporan terdaftar
        </span>

        <div class="pagination-controls">
          <button
            class="btn-page"
            :disabled="offset === 0 || loading"
            @click="changePage(-1)"
          >
            Sebelumnya
          </button>
          <span class="page-indicator">Hal {{ currentPage }} / {{ totalPages }}</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { adminReportsApi } from '@/services/api/admin-reports.api'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import {
  REPORT_STATUSES,
  STATUS_BADGE,
  KATEGORI_LABELS,
  KATEGORI_OPTIONS,
  reportAge,
} from '@/features/admin/config/reports'

const reports = ref([])
const loading = ref(false)
const isSearching = ref(false)
let searchTimer = null
const dataLoaded = ref(false)
const error = ref('')
const total = ref(0)
const totalByStatus = ref({})
const limit = ref(50)
const offset = ref(0)
const searchQuery = ref('')

const isTableLoading = computed(() => loading.value || isSearching.value)

const activeStatus = ref('')
const filterKategori = ref('')
const filterWilayah = ref('')

const kategoriOptions = KATEGORI_OPTIONS

const regionOptions = [
  { kode_bps: '1871', nama: 'Kota Bandar Lampung' },
  { kode_bps: '1872', nama: 'Kota Metro' },
  { kode_bps: '1801', nama: 'Kab. Lampung Barat' },
  { kode_bps: '1802', nama: 'Kab. Tanggamus' },
  { kode_bps: '1803', nama: 'Kab. Lampung Selatan' },
  { kode_bps: '1804', nama: 'Kab. Lampung Timur' },
  { kode_bps: '1805', nama: 'Kab. Lampung Tengah' },
  { kode_bps: '1806', nama: 'Kab. Lampung Utara' },
  { kode_bps: '1807', nama: 'Kab. Way Kanan' },
  { kode_bps: '1808', nama: 'Kab. Tulang Bawang' },
  { kode_bps: '1809', nama: 'Kab. Pesawaran' },
  { kode_bps: '1810', nama: 'Kab. Pringsewu' },
  { kode_bps: '1811', nama: 'Kab. Mesuji' },
  { kode_bps: '1812', nama: 'Kab. Tulang Bawang Barat' },
  { kode_bps: '1813', nama: 'Kab. Pesisir Barat' },
]

const formattedToday = computed(() => {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
})

const totalAllReports = computed(() => {
  const counts = totalByStatus.value || {}
  const sum = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0)
  return sum || total.value
})

const forwardedCount = computed(() => {
  const counts = totalByStatus.value || {}
  return (Number(counts['Diteruskan']) || 0) + (Number(counts['Ditindaklanjuti']) || 0)
})

const tabs = computed(() => {
  const counts = totalByStatus.value || {}
  return [
    { value: '', label: 'Semua Laporan', count: totalAllReports.value || null },
    ...REPORT_STATUSES.map((s) => ({
      value: s,
      label: s,
      count: counts[s] ?? null,
    })),
  ]
})

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const paginationFrom = computed(() => {
  if (total.value === 0) return 0
  return offset.value + 1
})

const paginationTo = computed(() => {
  return Math.min(offset.value + limit.value, total.value)
})

const filteredReports = computed(() => {
  let list = reports.value || []
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter((r) => {
      const matchTiket = r.tiket?.toLowerCase().includes(q)
      const matchProyek = r.proyek?.nama?.toLowerCase().includes(q)
      const matchLoc = r.proyek?.kabupaten?.toLowerCase().includes(q)
      const matchCat = r.kategori?.toLowerCase().includes(q)
      return matchTiket || matchProyek || matchLoc || matchCat
    })
  }
  return list
})

function kategoriLabel(k) {
  return KATEGORI_LABELS[k] || k || '—'
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function badgeStyle(status) {
  const cfg = STATUS_BADGE[status]
  if (!cfg) return ''
  return `color: ${cfg.text}; background: ${cfg.bg}`
}

function switchStatus(status) {
  activeStatus.value = status
  offset.value = 0
  refetch()
}

function toggleWaitingOnly() {
  if (activeStatus.value === 'Dilaporkan') {
    activeStatus.value = ''
  } else {
    activeStatus.value = 'Dilaporkan'
  }
  offset.value = 0
  refetch()
}

function changePage(delta) {
  const newOffset = offset.value + delta * limit.value
  if (newOffset < 0 || newOffset >= total.value) return
  offset.value = newOffset
  refetch()
}

async function refetch() {
  loading.value = true
  error.value = ''
  try {
    const params = { limit: limit.value, offset: offset.value }
    if (activeStatus.value) params.status = activeStatus.value
    if (filterKategori.value) params.kategori = filterKategori.value
    if (filterWilayah.value) params.kode_bps = filterWilayah.value

    const result = await adminReportsApi.list(params)
    reports.value = result.reports || []
    total.value = result.total || 0
    totalByStatus.value = result.totalByStatus || {}
    limit.value = result.limit || 50
    offset.value = result.offset || 0
    dataLoaded.value = true
  } catch (err) {
    error.value = err?.userMessage || err?.message || 'Gagal memuat daftar laporan.'
  } finally {
    loading.value = false
  }
}

function handleSearchInput() {
  isSearching.value = true
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    isSearching.value = false
  }, 220)
}

onMounted(refetch)

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.admin-reports-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Head */
.reports-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.reports-title-group {
  flex: 1 1 auto;
  min-width: 280px;
}

.reports-title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  line-height: 1.25;
}

.reports-sub {
  margin: 0;
  font-size: 12px;
  color: var(--c-muted, #6B6760);
  white-space: nowrap;
}

.reports-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
  width: 250px;
  height: 36px;
}

.search-box svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-muted, #6B6760);
}

.search-input {
  width: 100%;
  height: 100%;
  padding: 0 10px 0 32px;
  font-family: inherit;
  font-size: 11px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-md, 8px);
  color: var(--c-ink, #111111);
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: #ff5c00;
}

/* Tabs Bar */
.reports-tabs-bar {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-lg, 12px);
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
  border-radius: var(--r-md, 8px);
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
  padding: 1px 6px;
  font-size: 10px;
  border-radius: 999px;
  background: #e5e3dc;
  color: #4b5563;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.kpi-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-lg, 12px);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 90px;
}

.kpi-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--c-muted, #6B6760);
}

.kpi-val-row {
  margin: 4px 0 2px;
}

.kpi-val {
  font-size: 26px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  line-height: 1.1;
}

.kpi-sub {
  font-size: 11px;
  color: var(--c-subtle, #8C887B);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-danger { color: #dc2626 !important; }
.text-warning { color: #d97706 !important; }
.text-info { color: #2563eb !important; }
.text-primary { color: #ff5c00 !important; }
.text-success { color: #16a34a !important; }

/* Alert */
.alert-banner {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.alert-banner--danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}
.alert-close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  display: flex;
}

/* Main Table Card */
.reports-main-card {
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-lg, 12px);
  overflow: hidden;
}

/* Filter Bar */
.reports-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--c-surface, #FFFFFF);
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  flex-wrap: wrap;
  gap: 10px;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-select {
  height: 32px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 11px;
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  white-space: nowrap;
  flex-shrink: 0;
}

.chip-filter {
  height: 32px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  background: var(--c-bg, #F4F2EE);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  color: var(--c-muted, #6B6760);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.chip-filter .chip-dot {
  color: #d97706;
}

.chip-filter.is-active {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #b45309;
}

.btn-refresh {
  height: 32px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--c-bg, #F4F2EE);
}

/* Table */
.table-container {
  overflow-x: auto;
}

.reports-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 11.5px;
}

.reports-table th {
  background: var(--c-bg-alt, #F8F7F4);
  padding: 10px 14px;
  font-size: 10px;
  font-weight: 700;
  color: var(--c-muted, #6B6760);
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  white-space: nowrap;
}

.table-row {
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  transition: background 0.1s ease;
}

.table-row:hover {
  background: #faf9f6;
}

.reports-table td {
  padding: 12px 14px;
  vertical-align: middle;
}

/* Kolom Tiket */
.td-ticket {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 130px;
}

.ticket-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink, #111111);
  text-decoration: none;
}

.ticket-link:hover {
  color: #ff5c00;
  text-decoration: underline;
}

.ticket-date {
  font-size: 10.5px;
  color: var(--c-muted, #6B6760);
}

/* Kolom Proyek */
.td-project {
  min-width: 220px;
}

.project-name {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink, #111111);
  line-height: 1.35;
}

.project-loc {
  display: block;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
  margin-top: 2px;
}

/* Kolom Kategori */
.th-category,
.td-category {
  white-space: nowrap;
}

.category-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--c-bg, #F4F2EE);
  color: var(--c-ink, #111111);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

/* Bukti Link */
.th-evidence,
.td-evidence {
  white-space: nowrap;
}

.evidence-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
  white-space: nowrap;
}

.evidence-link:hover {
  text-decoration: underline;
}

/* SLA Badge */
.sla-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  background: #f1f0eb;
  color: #4b5563;
  font-size: 11px;
  font-weight: 600;
}

/* Status Pill */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.status-dot {
  font-size: 8px;
}

/* Aksi Detail Button */
.btn-detail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border-radius: 6px;
  background: #ff5c00;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s ease;
  white-space: nowrap;
}

.btn-detail:hover {
  background: #e65300;
}

.btn-detail .arrow {
  transition: transform 0.15s ease;
}

.btn-detail:hover .arrow {
  transform: translateX(2px);
}

/* Empty & Skeleton states */
.td-empty {
  text-align: center;
  padding: 48px 16px;
}

.empty-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.empty-desc {
  margin: 0;
  font-size: 12px;
  color: var(--c-muted, #6B6760);
}

.td-skeleton {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Pagination Footer */
.reports-card-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--c-border, #E7E3DC);
  background: var(--c-surface, #FFFFFF);
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-page {
  height: 28px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  color: var(--c-ink, #111111);
  cursor: pointer;
}

.btn-page:hover:not(:disabled) {
  background: var(--c-bg, #F4F2EE);
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
  font-weight: 600;
}

/* Responsif */
@media (max-width: 991.98px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .reports-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .reports-head-actions {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 8px;
  }
  .search-box {
    width: 100%;
  }
}

@media (max-width: 575.98px) {
  .kpi-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .filter-controls-row {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-select-wrap,
  .filter-select,
  .chip-filter,
  .btn-refresh {
    width: 100%;
    justify-content: center;
  }
  .reports-table {
    min-width: 780px;
  }
}
</style>
