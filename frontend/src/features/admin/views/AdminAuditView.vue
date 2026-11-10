<template>
  <div class="admin-audit-page">
    <!-- Header -->
    <header class="audit-head">
      <div>
        <h2 class="audit-title">Log Audit Sistem Permanen</h2>
        <p class="audit-desc">
          Pencatatan tak terhapus (append-only) seluruh aksi moderasi, sinkronisasi ETL, dan aktivitas administratif (FR-18, FR-44).
        </p>
      </div>
      <div class="audit-head-badge">
        <span class="audit-badge-dot" />
        <span>AUDIT TRAIL AKTIF</span>
      </div>
    </header>

    <!-- Top KPI Card -->
    <div class="audit-kpi-row">
      <div class="audit-kpi-card">
        <span class="audit-kpi-label">TOTAL CATATAN AUDIT</span>
        <div class="audit-kpi-val-wrap">
          <SkeletonBlock v-if="loading && !dataLoaded" height="32px" width="120px" radius="6px" />
          <span v-else class="audit-kpi-val">{{ total.toLocaleString('id-ID') }} Event</span>
        </div>
        <span class="audit-kpi-hint">Tercatat permanen di PostgreSQL (FR-44)</span>
      </div>

      <div class="audit-kpi-card">
        <span class="audit-kpi-label">AKSES &amp; OTORISASI</span>
        <div class="audit-kpi-val-wrap">
          <span class="audit-kpi-val text-success">RBAC Ditegakkan</span>
        </div>
        <span class="audit-kpi-hint">Hanya dapat diakses oleh Administrator &amp; Peninjau</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="error" class="audit-alert audit-alert--danger">
      <p>{{ error }}</p>
      <button class="audit-btn-retry" @click="fetchLogs">Coba Lagi</button>
    </div>

    <!-- Main Card: Filter + Table + Pagination -->
    <div class="audit-card">
      <!-- Filter Bar -->
      <div class="audit-filters">
        <div class="audit-filter-group">
          <label class="audit-filter-lbl">Modul:</label>
          <select v-model="filterModul" class="audit-select" @change="handleFilterChange">
            <option value="">Semua Modul</option>
            <option value="moderasi">Moderasi Laporan</option>
            <option value="etl">Pipa ETL &amp; Pencocokan</option>
            <option value="auth">Autentikasi &amp; Akses</option>
            <option value="project">Kelola Proyek</option>
          </select>
        </div>

        <div class="audit-filter-group">
          <label class="audit-filter-lbl">Dari:</label>
          <input
            v-model="filterStartDate"
            type="date"
            class="audit-input-date"
            @change="handleFilterChange"
          />
        </div>

        <div class="audit-filter-group">
          <label class="audit-filter-lbl">Sampai:</label>
          <input
            v-model="filterEndDate"
            type="date"
            class="audit-input-date"
            @change="handleFilterChange"
          />
        </div>

        <button class="audit-btn-refresh" :disabled="loading" @click="fetchLogs">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M14 8A6 6 0 1 1 9.5 2.5M14 2.5v4h-4" />
          </svg>
          <span>{{ loading ? 'Memuat…' : 'Segarkan' }}</span>
        </button>

        <span class="audit-counter">
          Menampilkan {{ total ? offset + 1 : 0 }}–{{ Math.min(offset + limit, total) }} dari {{ total }} event
        </span>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !dataLoaded" class="audit-loading-wrap">
        <SkeletonBlock v-for="i in 8" :key="i" height="46px" radius="6px" class="audit-skeleton-row" />
      </div>

      <!-- Empty State -->
      <div v-else-if="!logs.length" class="audit-empty-wrap">
        <p>Tidak ada catatan audit yang cocok dengan kriteria filter saat ini.</p>
      </div>

      <!-- Table Scroll -->
      <div v-else class="audit-table-scroll">
        <table class="audit-table">
          <thead>
            <tr>
              <th>WAKTU (WIB)</th>
              <th>AKTOR &amp; PERAN</th>
              <th>MODUL</th>
              <th>AKSI / EVENT</th>
              <th>RINCIAN PERUBAHAN (DIFF)</th>
              <th>IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in logs" :key="row.id">
              <!-- Waktu -->
              <td class="cell-time">
                <span class="cell-time-main">{{ formatWib(row.waktu) }}</span>
                <span class="cell-time-rel">{{ formatRelativeTime(row.waktu) }}</span>
              </td>

              <!-- Aktor & Peran -->
              <td class="cell-actor">
                <div class="actor-wrap">
                  <span class="actor-avatar">{{ getInitials(row.aktor_nama) }}</span>
                  <div class="actor-info">
                    <span class="actor-name">{{ row.aktor_nama || 'Sistem' }}</span>
                    <span class="actor-role">{{ row.peran || 'system' }}</span>
                  </div>
                </div>
              </td>

              <!-- Modul -->
              <td class="cell-modul">
                <span class="modul-badge">{{ formatModul(row.modul) }}</span>
              </td>

              <!-- Aksi / Event -->
              <td class="cell-action">
                <span class="action-badge" :class="actionClass(row.aksi)">
                  {{ row.aksi }}
                </span>
                <span v-if="row.target_id" class="target-tag">
                  Target: {{ row.target_id }}
                </span>
              </td>

              <!-- Rincian Perubahan (Diff) -->
              <td class="cell-diff">
                <AuditDiffViewer :diff="row.diff" />
              </td>

              <!-- IP Address -->
              <td class="cell-ip">
                <code>{{ row.ip || '—' }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="audit-pagination">
        <span class="audit-pag-info">
          Halaman {{ currentPage }} dari {{ totalPages || 1 }}
        </span>
        <div class="audit-pag-actions">
          <button
            class="audit-pag-btn"
            :disabled="offset === 0 || loading"
            @click="changePage(-1)"
          >
            Sebelumnya
          </button>
          <button
            class="audit-pag-btn"
            :disabled="offset + limit >= total || loading"
            @click="changePage(1)"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminAuditApi } from '@/services/api/admin-audit.api'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import AuditDiffViewer from '@/features/admin/components/AuditDiffViewer.vue'

const loading = ref(true)
const dataLoaded = ref(false)
const error = ref('')

const logs = ref([])
const total = ref(0)
const limit = ref(50)
const offset = ref(0)

const filterModul = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
const totalPages = computed(() => Math.ceil(total.value / limit.value))

function formatWib(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat('id-ID', {
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

function formatModul(modul) {
  const map = {
    moderasi: 'Moderasi Laporan',
    etl: 'Pipa ETL',
    auth: 'Autentikasi',
    project: 'Kelola Proyek',
  }
  return map[modul] || modul || 'Sistem'
}

function actionClass(aksi) {
  if (aksi?.includes('VERIFY')) return 'badge-success'
  if (aksi?.includes('REJECT') || aksi?.includes('FAIL')) return 'badge-danger'
  if (aksi?.includes('FORWARD')) return 'badge-info'
  if (aksi?.includes('SYNC') || aksi?.includes('MATCH')) return 'badge-warning'
  return 'badge-subtle'
}

async function fetchLogs() {
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
    logs.value = res.logs
    total.value = res.total
    limit.value = res.limit
    offset.value = res.offset
    dataLoaded.value = true
  } catch (err) {
    error.value = err.message || 'Gagal memuat log audit'
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
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

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.admin-audit-page {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  max-width: 1400px;
}

/* Header */
.audit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
  padding-bottom: var(--sp-3);
  border-bottom: var(--bw) solid var(--c-border);
}
.audit-title {
  font-size: var(--fs-2xl);
  font-weight: 800;
  color: var(--c-ink);
  margin: 0 0 4px 0;
}
.audit-desc {
  font-size: var(--fs-sm);
  color: var(--c-muted);
  margin: 0;
}
.audit-head-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--c-success-soft);
  color: var(--c-success);
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--r-pill);
  border: 1px solid rgba(46, 139, 87, 0.2);
}
.audit-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-success);
}

/* KPI Row */
.audit-kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--sp-4);
}
.audit-kpi-card {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-lg);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.audit-kpi-label {
  font-size: var(--fs-micro);
  font-weight: 700;
  color: var(--c-muted);
  letter-spacing: 0.5px;
}
.audit-kpi-val-wrap {
  display: flex;
  align-items: baseline;
}
.audit-kpi-val {
  font-size: 24px;
  font-weight: 800;
  color: var(--c-ink);
}
.audit-kpi-val.text-success { color: var(--c-success); }
.audit-kpi-hint {
  font-size: var(--fs-xs);
  color: var(--c-subtle);
}

/* Alert */
.audit-alert {
  padding: 12px 16px;
  border-radius: var(--r-md);
  font-size: var(--fs-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.audit-alert--danger {
  background: var(--c-danger-soft);
  color: var(--c-danger);
  border: 1px solid rgba(214, 58, 31, 0.2);
}
.audit-btn-retry {
  background: none;
  border: 1px solid var(--c-danger);
  color: var(--c-danger);
  border-radius: var(--r-xs);
  padding: 4px 8px;
  font-size: var(--fs-xs);
  cursor: pointer;
}

/* Main Card */
.audit-card {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-lg);
  overflow: hidden;
}

/* Filters */
.audit-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-3);
  padding: 16px 20px;
  border-bottom: var(--bw) solid var(--c-border);
  background: var(--c-bg-alt);
}
.audit-filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.audit-filter-lbl {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-muted);
}
.audit-select,
.audit-input-date {
  height: 32px;
  padding: 0 10px;
  font-size: var(--fs-xs);
  font-family: inherit;
  color: var(--c-ink);
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border-strong);
  border-radius: var(--r-sm);
}
.audit-btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-ink);
  cursor: pointer;
}
.audit-btn-refresh:hover:not(:disabled) {
  background: var(--c-bg);
}
.audit-counter {
  margin-left: auto;
  font-size: var(--fs-xs);
  color: var(--c-muted);
}

/* Table */
.audit-table-scroll {
  overflow-x: auto;
}
.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-xs);
}
.audit-table th {
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
.audit-table td {
  padding: 12px 16px;
  border-bottom: var(--bw) solid var(--c-border);
  color: var(--c-ink);
  vertical-align: top;
}
.audit-table tr:last-child td {
  border-bottom: none;
}

/* Cells */
.cell-time {
  white-space: nowrap;
}
.cell-time-main {
  display: block;
  font-weight: 600;
}
.cell-time-rel {
  display: block;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}

.cell-actor {
  min-width: 160px;
}
.actor-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.actor-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-ink);
  flex: none;
}
.actor-name {
  display: block;
  font-weight: 600;
}
.actor-role {
  display: block;
  font-size: var(--fs-micro);
  color: var(--c-subtle);
}

.modul-badge {
  font-size: var(--fs-micro);
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--r-xs);
  background: var(--c-bg);
  color: var(--c-muted);
  white-space: nowrap;
}

.cell-action {
  white-space: nowrap;
}
.action-badge {
  display: inline-block;
  font-size: var(--fs-micro);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--r-pill);
}
.action-badge.badge-success { background: var(--c-success-soft); color: var(--c-success); }
.action-badge.badge-danger { background: var(--c-danger-soft); color: var(--c-danger); }
.action-badge.badge-info { background: var(--c-info-soft); color: var(--c-info); }
.action-badge.badge-warning { background: var(--c-warning-soft); color: var(--c-warning); }
.action-badge.badge-subtle { background: var(--c-bg); color: var(--c-muted); }

.target-tag {
  display: block;
  font-size: var(--fs-micro);
  color: var(--c-subtle);
  margin-top: 2px;
}

.cell-diff {
  min-width: 200px;
  max-width: 360px;
}

.cell-ip code {
  font-family: monospace;
  font-size: var(--fs-micro);
  color: var(--c-muted);
}

/* Pagination */
.audit-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: var(--bw) solid var(--c-border);
  background: var(--c-surface);
}
.audit-pag-info {
  font-size: var(--fs-xs);
  color: var(--c-muted);
}
.audit-pag-actions {
  display: flex;
  gap: 8px;
}
.audit-pag-btn {
  height: 32px;
  padding: 0 14px;
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-ink);
  cursor: pointer;
  transition: all 0.12s;
}
.audit-pag-btn:hover:not(:disabled) {
  background: var(--c-bg);
}
.audit-pag-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.audit-loading-wrap,
.audit-empty-wrap {
  padding: 32px 20px;
}
.audit-empty-wrap {
  text-align: center;
  color: var(--c-muted);
  font-size: var(--fs-sm);
}
.audit-skeleton-row {
  margin-bottom: 8px;
}
</style>
