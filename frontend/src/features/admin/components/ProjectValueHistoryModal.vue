<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <!-- Header -->
      <div class="modal-head">
        <div>
          <span class="badge-history">AUDIT TRAIL NILAI</span>
          <h3 id="history-title" class="modal-title">Riwayat Perubahan Nilai &amp; Skor Risiko</h3>
          <p class="modal-sub">
            Proyek: <strong>{{ project?.nama }}</strong>
            <span v-if="project?.kode_rup"> ({{ project.kode_rup }})</span>
          </p>
        </div>
        <button class="btn-close" aria-label="Tutup modal" @click="close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Info Banner -->
      <div class="history-info-banner">
        <span class="info-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </span>
        <span>
          Setiap pergeseran angka pagu, HPS, atau kontrak tercatat tak terhapus untuk mencegah pengalihan nilai proyek secara diam-diam.
        </span>
      </div>

      <!-- Body / Table -->
      <div class="modal-body">
        <div v-if="loading" class="loading-wrap">
          <SkeletonBlock height="24px" width="100%" radius="4px" />
          <SkeletonBlock height="24px" width="100%" radius="4px" />
          <SkeletonBlock height="24px" width="100%" radius="4px" />
        </div>

        <div v-else-if="errorMsg" class="error-wrap">
          <p>{{ errorMsg }}</p>
          <button class="btn-retry" @click="fetchHistory">Coba Lagi</button>
        </div>

        <div v-else-if="historyList.length === 0" class="empty-wrap">
          <p class="empty-title">Belum ada riwayat mutasi nilai</p>
          <p class="empty-desc">
            Nilai proyek saat ini: <strong>Pagu {{ formatCurrency(project?.pagu) }}</strong>
            <span v-if="project?.hps"> · HPS {{ formatCurrency(project?.hps) }}</span>. Belum ada perubahan yang dilakukan sejak data pertama kali dicatat.
          </p>
        </div>

        <div v-else class="table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th scope="col">WAKTU PERUBAHAN</th>
                <th scope="col">PARAMETER</th>
                <th scope="col">PERUBAHAN NILAI</th>
                <th scope="col">DAMPAK SKOR</th>
                <th scope="col">OPERATOR / AKTOR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in historyList" :key="idx">
                <td class="td-time">
                  {{ formatDateTime(item.waktu || item.created_at) }}
                </td>
                <td class="td-param">
                  <span class="badge-param">{{ (item.kolom || item.parameter || 'pagu').toUpperCase() }}</span>
                </td>
                <td class="td-values">
                  <span class="val-old">{{ formatCurrency(item.nilai_lama) }}</span>
                  <span class="val-arrow" aria-hidden="true">→</span>
                  <span class="val-new">{{ formatCurrency(item.nilai_baru) }}</span>
                </td>
                <td class="td-score">
                  <span class="score-pill">
                    {{ item.skor_sebelum ?? '—' }} → {{ item.skor_sesudah ?? '—' }}
                  </span>
                </td>
                <td class="td-actor">
                  <span class="actor-name">{{ item.aktor_nama || 'Administrator' }}</span>
                  <span class="actor-role">{{ item.peran || 'admin' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-foot">
        <button class="btn-close-foot" @click="close">Tutup</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { adminProjectsApi } from '@/services/api/admin-projects.api'
import { formatCurrency } from '@/utils/formatters'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  project: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

const historyList = ref([])
const loading = ref(false)
const errorMsg = ref('')

function formatDateTime(val) {
  if (!val) return '—'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

function close() {
  emit('update:modelValue', false)
}

async function fetchHistory() {
  if (!props.project?.id) return
  loading.value = true
  errorMsg.value = ''

  try {
    const data = await adminProjectsApi.getValueHistory(props.project.id)
    historyList.value = Array.isArray(data) ? data : []
  } catch (err) {
    errorMsg.value = err.message || 'Gagal mengambil riwayat perubahan nilai proyek'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.project?.id) {
      fetchHistory()
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1050;
}

.modal-card {
  width: 100%;
  max-width: 760px;
  max-height: 85vh;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: var(--r-lg, 12px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 22px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
}

.badge-history {
  display: inline-block;
  padding: 2px 7px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--c-info, #2F6FDE);
  background: var(--c-info-soft, #EBF2FC);
  border-radius: var(--r-xs, 4px);
  margin-bottom: 4px;
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--c-ink, #111111);
}

.modal-sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

.btn-close {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--c-muted, #6B6760);
  cursor: pointer;
  padding: 4px 6px;
}

.history-info-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  background: var(--c-bg-alt, #F8F7F4);
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

.modal-body {
  padding: 16px 22px;
  overflow-y: auto;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 0;
}

.error-wrap {
  padding: 24px;
  text-align: center;
  color: var(--c-danger, #D63A1F);
  font-size: 12px;
}

.btn-retry {
  margin-top: 8px;
  height: 30px;
  padding: 0 12px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

.empty-wrap {
  padding: 40px 16px;
  text-align: center;
}

.empty-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.empty-desc {
  margin: 0;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

.table-wrap {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  text-align: left;
}

.history-table th {
  background: var(--c-bg-alt, #F8F7F4);
  color: var(--c-ink, #111111);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 10px 12px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
}

.history-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
  vertical-align: middle;
}

.badge-param {
  display: inline-block;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 700;
  border-radius: var(--r-xs, 4px);
  background: var(--c-bg, #F4F2EE);
  color: var(--c-ink, #111111);
  border: 1px solid var(--c-border, #E7E3DC);
}

.td-values {
  white-space: nowrap;
}

.val-old {
  color: var(--c-muted, #6B6760);
}

.val-arrow {
  margin: 0 6px;
  color: var(--c-muted, #6B6760);
}

.val-new {
  font-weight: 700;
  color: var(--c-ink, #111111);
}

.score-pill {
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  border-radius: var(--r-pill, 999px);
  background: var(--c-warning-soft, #FDF0D8);
  color: #B45309;
}

.td-actor {
  display: flex;
  flex-direction: column;
}

.actor-name {
  font-weight: 600;
  color: var(--c-ink, #111111);
}

.actor-role {
  font-size: 9.5px;
  color: var(--c-muted, #6B6760);
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  padding: 12px 22px;
  border-top: 1px solid var(--c-border, #E7E3DC);
  background: var(--c-bg-alt, #F8F7F4);
}

.btn-close-foot {
  height: 36px;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

@media (max-width: 640px) {
  .modal-backdrop {
    padding: 8px;
    align-items: flex-end;
  }
  .modal-card {
    max-width: 100%;
    margin: 0;
    border-radius: 16px 16px 0 0;
    max-height: 90vh;
  }
  .history-table {
    min-width: 650px;
  }
  .modal-foot {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-close-foot {
    width: 100%;
    justify-content: center;
  }
}
</style>
