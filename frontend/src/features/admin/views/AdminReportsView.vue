<template>
  <div class="reports-list">
    <!-- Status tabs — frame 02: bar di atas kartu -->
    <div class="reports-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="reports-tab"
        :class="{ 'is-active': activeStatus === tab.value }"
        @click="switchStatus(tab.value)"
      >
        {{ tab.label }}
        <span v-if="tab.count != null" class="reports-tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Loading / error / empty -->
    <div v-if="loading" class="reports-state">Memuat…</div>
    <div v-else-if="error" class="reports-state reports-state--error">{{ error }}</div>
    <div v-else-if="!reports.length" class="reports-state">Tidak ada laporan pada filter ini.</div>

    <!-- Table card — frame 02 Table Card: #FFFFFF + 1px #E7E3DC + r16
         Berisi: filter bar + tabel + pagination dalam satu kartu -->
    <div v-else class="reports-card">
      <!-- Filter bar di dalam kartu — frame 02: DD kategori + wilayah + info kanan -->
      <div class="reports-card-filters">
        <select v-model="filterKategori" class="reports-dd" @change="refetch">
          <option v-for="opt in kategoriOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <input
          v-model.trim="filterWilayah"
          type="text"
          class="reports-dd reports-dd--input"
          placeholder="Kode BPS wilayah…"
          @keyup.enter="refetch"
        />
        <button class="reports-dd-btn" @click="refetch">Terapkan</button>
        <span class="reports-card-info">
          Menampilkan {{ offset + 1 }}–{{ offset + reports.length }} dari {{ total }} antrean
        </span>
      </div>

      <!-- Table -->
      <div class="reports-table-scroll">
        <table class="reports-table">
          <thead>
            <tr>
              <th>TIKET</th>
              <th>PROYEK TERKAIT</th>
              <th>KATEGORI LAPORAN</th>
              <th>BUKTI &amp; GPS</th>
              <th>UMUR SLA</th>
              <th>STATUS</th>
              <th>AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in reports" :key="row.tiket">
              <td class="cell-tiket">{{ row.tiket }}</td>
              <td class="cell-proyek">
                <span class="cell-proyek-name">{{ row.proyek?.nama || '—' }}</span>
                <span class="cell-proyek-loc">{{ row.proyek?.kabupaten || '' }}</span>
              </td>
              <td><span class="cell-cat">{{ kategoriLabel(row.kategori) }}</span></td>
              <td class="cell-bukti">
                <RouterLink :to="`/admin/laporan/${row.tiket}`" class="cell-bukti-link">Lihat bukti</RouterLink>
              </td>
              <td><span class="cell-umur-badge">{{ reportAge(row.dibuat_pada) }}</span></td>
              <td><span class="reports-badge" :style="badgeStyle(row.status)">{{ row.status }}</span></td>
              <td><RouterLink :to="`/admin/laporan/${row.tiket}`" class="cell-act">Periksa →</RouterLink></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination di dalam kartu — frame 02 format -->
      <div class="reports-card-pagination">
        <span class="reports-pag-info">
          Menampilkan {{ offset + 1 }}–{{ offset + reports.length }} dari {{ total }} laporan warga (Halaman {{ currentPage }} dari {{ totalPages }})
        </span>
        <div class="reports-pag-btns">
          <button class="reports-pag-btn" :disabled="offset === 0" @click="changePage(-1)">Sebelumnya</button>
          <button class="reports-pag-btn" :disabled="offset + limit >= total" @click="changePage(1)">Berikutnya</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { adminReportsApi } from '@/services/api/admin-reports.api'
import {
  REPORT_STATUSES,
  STATUS_BADGE,
  KATEGORI_LABELS,
  KATEGORI_OPTIONS,
  reportAge,
} from '@/features/admin/config/reports'

const reports = ref([])
const loading = ref(false)
const error = ref('')
const total = ref(0)
const totalByStatus = ref({})
const limit = ref(50)
const offset = ref(0)

const activeStatus = ref('')
const filterKategori = ref('')
const filterWilayah = ref('')

const kategoriOptions = KATEGORI_OPTIONS

const tabs = computed(() => {
  const counts = totalByStatus.value
  const all = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0)
  return [
    { value: '', label: 'Semua', count: all || null },
    ...REPORT_STATUSES.map((s) => ({
      value: s,
      label: s,
      count: counts[s] ?? null,
    })),
  ]
})

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

function kategoriLabel(k) {
  return KATEGORI_LABELS[k] || k || '—'
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
    reports.value = result.reports
    total.value = result.total
    totalByStatus.value = result.totalByStatus
    limit.value = result.limit
    offset.value = result.offset
  } catch (err) {
    error.value = err?.userMessage || err?.message || 'Gagal memuat daftar laporan.'
  } finally {
    loading.value = false
  }
}

onMounted(refetch)
</script>

<style scoped>
.reports-list { display: flex; flex-direction: column; gap: var(--sp-4); }

/* Tabs — frame 02 Sub Header Tabs */
.reports-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
  border-bottom: var(--bw) solid var(--c-border);
}
.reports-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: var(--fs-sm);
  font-weight: 500;
  font-family: var(--font);
  color: var(--c-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s;
  margin-bottom: -1px;
}
.reports-tab:hover { color: var(--c-ink); }
.reports-tab.is-active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
  font-weight: 600;
}
.reports-tab-count {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-muted);
  background: var(--c-bg);
  padding: 1px 6px;
  border-radius: var(--r-pill);
}

/* States */
.reports-state {
  padding: var(--sp-6);
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--c-muted);
}
.reports-state--error { color: var(--c-danger); }

/* Table card — frame 02 Table Card: #FFFFFF + 1px #E7E3DC + r16 */
.reports-card {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-xl);
  overflow: hidden;
}

/* Filter bar di dalam kartu */
.reports-card-filters {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
  align-items: center;
  padding: var(--sp-3) var(--sp-4);
  border-bottom: var(--bw) solid var(--c-border);
}
.reports-dd {
  height: 32px;
  padding: 0 10px;
  font-size: var(--fs-sm);
  font-family: var(--font);
  color: var(--c-ink);
  background: var(--c-bg);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-md);
}
.reports-dd--input { flex: 1; min-width: 140px; }
.reports-dd:focus { outline: none; border-color: var(--c-primary); }
.reports-dd-btn {
  height: 32px;
  padding: 0 16px;
  font-size: var(--fs-sm);
  font-weight: 600;
  font-family: var(--font);
  color: var(--c-ink);
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-md);
  cursor: pointer;
}
.reports-dd-btn:hover { background: var(--c-bg); }
.reports-card-info {
  margin-left: auto;
  font-size: var(--fs-xs);
  color: var(--c-muted);
}

/* Table scroll */
.reports-table-scroll { overflow-x: auto; }
.reports-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
  min-width: 800px;
}
.reports-table thead { background: var(--c-bg-alt); }
.reports-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-muted);
  border-bottom: var(--bw) solid var(--c-border);
  white-space: nowrap;
}
.reports-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #F0EEEA;
  color: var(--c-ink);
  vertical-align: middle;
}
.reports-table tbody tr:last-child td { border-bottom: none; }
.reports-table tbody tr:hover { background: var(--c-bg-alt); }

/* Cells */
.cell-tiket { font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.cell-proyek { display: flex; flex-direction: column; gap: 2px; }
.cell-proyek-name { font-weight: 600; }
.cell-proyek-loc { font-size: var(--fs-xs); color: var(--c-muted); }

/* Category badge — frame 02 R0 Cat Box: #F4F2EE r6 */
.cell-cat {
  display: inline-block;
  padding: 3px 10px;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-muted);
  background: var(--c-bg);
  border-radius: var(--r-sm);
  white-space: nowrap;
}

.cell-bukti-link {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-info);
  white-space: nowrap;
}

/* Umur badge — frame 02 R0 SLA Box */
.cell-umur-badge {
  display: inline-block;
  padding: 3px 12px;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-muted);
  background: var(--c-bg);
  border-radius: var(--r-md);
  white-space: nowrap;
}

/* Status badge — frame 02 R0 St Box */
.reports-badge {
  display: inline-block;
  padding: 3px 12px;
  font-size: var(--fs-xs);
  font-weight: 700;
  border-radius: var(--r-md);
  white-space: nowrap;
}

/* Action button — frame 02 R0 Act Btn: #111111 pill */
.cell-act {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 16px;
  font-size: var(--fs-sm);
  font-weight: 600;
  font-family: var(--font);
  color: var(--c-surface);
  background: var(--c-ink);
  border-radius: var(--r-pill);
  white-space: nowrap;
  transition: opacity 0.12s;
}
.cell-act:hover { opacity: 0.85; }

/* Pagination di dalam kartu */
.reports-card-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-top: var(--bw) solid var(--c-border);
}
.reports-pag-info { font-size: var(--fs-xs); color: var(--c-muted); }
.reports-pag-btns { display: flex; gap: var(--sp-2); }
.reports-pag-btn {
  height: 32px;
  padding: 0 12px;
  font-size: var(--fs-sm);
  font-weight: 500;
  font-family: var(--font);
  color: var(--c-ink);
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-md);
  cursor: pointer;
}
.reports-pag-btn:hover:not(:disabled) { background: var(--c-bg); }
.reports-pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
