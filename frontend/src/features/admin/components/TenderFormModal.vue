<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="tender-title">
      <!-- Head -->
      <div class="modal-head">
        <div>
          <span class="badge-tender">PAKET TENDER SPSE</span>
          <h3 id="tender-title" class="modal-title">Kelola Tender Turunan Proyek</h3>
          <p class="modal-sub">
            Proyek: <strong>{{ project?.nama }}</strong> · Pagu: <strong>{{ formatCurrency(project?.pagu) }}</strong>
          </p>
        </div>
        <button class="btn-close" aria-label="Tutup modal" @click="close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <!-- Error & Success Alert -->
        <div v-if="errorMsg" class="alert-box alert-box--danger">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>{{ errorMsg }}</p>
        </div>
        <div v-if="successMsg" class="alert-box alert-box--success">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <p>{{ successMsg }}</p>
        </div>

        <!-- Section: Daftar Tender Yang Ada -->
        <div class="tenders-section">
          <div class="section-head">
            <h4 class="section-title">Daftar Tender Terdaftar ({{ tenders.length }})</h4>
            <button
              v-if="!showForm"
              class="btn-add-tender"
              @click="openAddForm"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Tambah Paket Tender</span>
            </button>
          </div>

          <div v-if="loadingTenders" class="tenders-loading">
            <SkeletonBlock height="28px" width="100%" radius="4px" />
            <SkeletonBlock height="28px" width="100%" radius="4px" />
          </div>

          <div v-else-if="tenders.length === 0 && !showForm" class="tenders-empty">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <p>Belum ada paket lelang SPSE yang terhubung dengan proyek ini.</p>
          </div>

          <div v-else-if="!showForm" class="tenders-table-wrap">
            <table class="tenders-table">
              <thead>
                <tr>
                  <th scope="col">ID TENDER</th>
                  <th scope="col">JUMLAH PENAWAR</th>
                  <th scope="col">HARGA PENAWARAN MENANG</th>
                  <th scope="col">JADWAL LELANG</th>
                  <th scope="col">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in tenders" :key="t.id">
                  <td class="td-code">
                    <code>{{ (t.id || '').slice(0, 8) }}…</code>
                  </td>
                  <td class="td-penawar">
                    <span :class="['badge-penawar', t.jumlah_penawar < 3 ? 'badge-penawar--low' : 'badge-penawar--good']">
                      {{ t.jumlah_penawar ?? 0 }} Penawar
                    </span>
                    <span v-if="t.jumlah_penawar !== null && t.jumlah_penawar < 3" class="hint-monopoli">
                      (Potensi Monopoli)
                    </span>
                  </td>
                  <td class="td-money">
                    <strong>{{ formatCurrency(t.harga_penawaran_menang) }}</strong>
                    <div v-if="project?.hps && t.harga_penawaran_menang" class="td-ratio">
                      Rasio HPS: {{ Math.round((Number(t.harga_penawaran_menang) / Number(project.hps)) * 100) }}%
                    </div>
                  </td>
                  <td class="td-date">
                    <div>Pengumuman: {{ t.tgl_pengumuman || '—' }}</div>
                    <div>Penetapan: {{ t.tgl_penetapan || '—' }}</div>
                  </td>
                  <td class="td-actions">
                    <button class="btn-edit-sm" title="Ubah tender" @click="openEditForm(t)">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>Ubah</span>
                    </button>
                    <button class="btn-del-sm" title="Hapus tender" @click="handleDeleteTender(t)">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Hapus</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section Form Tambah/Ubah Tender Inline -->
        <div v-if="showForm" class="tender-form-card">
          <div class="form-card-head">
            <h5 class="form-card-title">{{ editingTender ? 'Ubah Data Tender SPSE' : 'Tambah Paket Tender Baru' }}</h5>
            <button class="btn-cancel-form" @click="showForm = false">Batal</button>
          </div>

          <form @submit.prevent="handleSaveTender">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="t-penawar">
                  JUMLAH PENAWAR LELANG <span class="req">*</span>
                </label>
                <input
                  id="t-penawar"
                  v-model.number="tenderForm.jumlah_penawar"
                  type="number"
                  class="form-input"
                  min="0"
                  placeholder="Contoh: 3"
                  required
                />
                <span class="field-hint">
                  Jika &lt; 3 penawar, memicu indikator risiko persaingan semu lelang.
                </span>
              </div>

              <div class="form-group">
                <label class="form-label" for="t-harga">
                  HARGA PENAWARAN PEMENANG (RUPIAH)
                </label>
                <input
                  id="t-harga"
                  v-model.number="tenderForm.harga_penawaran_menang"
                  type="number"
                  class="form-input"
                  min="0"
                  step="1000"
                  placeholder="Nilai penawaran pemenang tender"
                />
                <span v-if="project?.hps && tenderForm.harga_penawaran_menang" class="field-hint">
                  Rasio terhadap HPS: {{ Math.round((tenderForm.harga_penawaran_menang / project.hps) * 100) }}%
                </span>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="t-tgl-pengumuman">
                  TANGGAL PENGUMUMAN TENDER
                </label>
                <input
                  id="t-tgl-pengumuman"
                  v-model="tenderForm.tgl_pengumuman"
                  type="date"
                  class="form-input"
                />
                <span class="field-hint">Format: YYYY-MM-DD</span>
              </div>

              <div class="form-group">
                <label class="form-label" for="t-tgl-penetapan">
                  TANGGAL PENETAPAN PEMENANG
                </label>
                <input
                  id="t-tgl-penetapan"
                  v-model="tenderForm.tgl_penetapan"
                  type="date"
                  class="form-input"
                />
                <span class="field-hint">Format: YYYY-MM-DD</span>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-cancel" @click="showForm = false">Batal</button>
              <button type="submit" class="btn-submit" :disabled="savingTender">
                <svg v-if="!savingTender" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>{{ savingTender ? 'Menyimpan…' : 'Simpan Tender' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Foot -->
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
import { useToast } from '@/composables/useToast'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  project: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'tender-updated'])
const toast = useToast()

const tenders = ref([])
const loadingTenders = ref(false)
const savingTender = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const showForm = ref(false)
const editingTender = ref(null)

const tenderForm = ref({
  jumlah_penawar: 3,
  harga_penawaran_menang: null,
  tgl_pengumuman: '',
  tgl_penetapan: '',
})

function close() {
  emit('update:modelValue', false)
}

async function loadTenders() {
  if (!props.project?.id) return
  loadingTenders.value = true
  errorMsg.value = ''
  try {
    const res = await adminProjectsApi.getTenders(props.project.id)
    tenders.value = Array.isArray(res) ? res : []
  } catch (err) {
    errorMsg.value = err.message || 'Gagal memuat data tender proyek'
    tenders.value = []
  } finally {
    loadingTenders.value = false
  }
}

function openAddForm() {
  editingTender.value = null
  tenderForm.value = {
    jumlah_penawar: 3,
    harga_penawaran_menang: props.project?.nilai_kontrak || (props.project?.hps ? Math.floor(props.project.hps * 0.95) : null),
    tgl_pengumuman: '',
    tgl_penetapan: '',
  }
  showForm.value = true
  errorMsg.value = ''
  successMsg.value = ''
}

function openEditForm(tender) {
  editingTender.value = tender
  tenderForm.value = {
    jumlah_penawar: tender.jumlah_penawar ?? 0,
    harga_penawaran_menang: tender.harga_penawaran_menang ? Number(tender.harga_penawaran_menang) : null,
    tgl_pengumuman: tender.tgl_pengumuman || '',
    tgl_penetapan: tender.tgl_penetapan || '',
  }
  showForm.value = true
  errorMsg.value = ''
  successMsg.value = ''
}

async function handleSaveTender() {
  savingTender.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    const payload = {
      jumlah_penawar: Number(tenderForm.value.jumlah_penawar) || 0,
    }
    if (tenderForm.value.harga_penawaran_menang) {
      payload.harga_penawaran_menang = Math.round(Number(tenderForm.value.harga_penawaran_menang))
    }
    if (tenderForm.value.tgl_pengumuman) {
      payload.tgl_pengumuman = tenderForm.value.tgl_pengumuman
    }
    if (tenderForm.value.tgl_penetapan) {
      payload.tgl_penetapan = tenderForm.value.tgl_penetapan
    }

    if (editingTender.value?.id) {
      await adminProjectsApi.updateTender(editingTender.value.id, payload)
      successMsg.value = 'Data tender berhasil diperbarui. Skor risiko proyek telah dihitung ulang.'
    } else {
      await adminProjectsApi.createTender(props.project.id, payload)
      successMsg.value = 'Tender baru berhasil ditambahkan. Skor risiko proyek telah dihitung ulang.'
    }
    toast.success(successMsg.value, 'Tender Disimpan')
    showForm.value = false
    await loadTenders()
    emit('tender-updated')
  } catch (err) {
    errorMsg.value = err.response?.data?.message || err.message || 'Gagal menyimpan data tender'
    toast.error(errorMsg.value, 'Gagal Menyimpan Tender')
  } finally {
    savingTender.value = false
  }
}

async function handleDeleteTender(tender) {
  if (!confirm(`Hapus data tender (ID: ${(tender.id || '').slice(0, 8)}…)?`)) return
  try {
    await adminProjectsApi.deleteTender(tender.id)
    successMsg.value = 'Tender berhasil dihapus. Skor risiko proyek telah dihitung ulang.'
    toast.success(successMsg.value, 'Tender Dihapus')
    await loadTenders()
    emit('tender-updated')
  } catch (err) {
    errorMsg.value = err.response?.data?.message || err.message || 'Gagal menghapus tender'
    toast.error(errorMsg.value, 'Gagal Menghapus Tender')
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.project?.id) {
      showForm.value = false
      errorMsg.value = ''
      successMsg.value = ''
      loadTenders()
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
  max-width: 820px;
  max-height: 88vh;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: var(--r-lg, 12px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 24px;
  border-bottom: 1px solid var(--c-border, #EAE6DF);
  background: var(--c-surface-muted, #F8F6F0);
}

.badge-tender {
  display: inline-block;
  padding: 2px 8px;
  font-family: var(--f-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  color: var(--c-ink-muted, #666);
  background: var(--c-surface, #FFF);
  border: 1px solid var(--c-border, #EAE6DF);
  border-radius: 4px;
  margin-bottom: 6px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--c-ink, #111);
  margin: 0 0 4px;
}

.modal-sub {
  font-size: 12px;
  color: var(--c-ink-muted, #666);
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--c-ink-muted, #666);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-close:hover {
  background: var(--c-surface, #FFF);
  color: var(--c-ink, #111);
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.alert-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 16px;
}

.alert-box--danger {
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.3);
  color: #DC2626;
}

.alert-box--success {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #059669;
}

.tenders-section {
  margin-bottom: 20px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--c-ink, #111);
  margin: 0;
}

.btn-add-tender {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  background: var(--c-ink, #111);
  color: #FFF;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-add-tender:hover {
  opacity: 0.85;
}

.tenders-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  border: 1px dashed var(--c-border, #EAE6DF);
  border-radius: 8px;
  color: var(--c-ink-muted, #666);
  font-size: 13px;
  text-align: center;
}

.tenders-table-wrap {
  border: 1px solid var(--c-border, #EAE6DF);
  border-radius: 8px;
  overflow: hidden;
}

.tenders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.tenders-table th {
  background: var(--c-surface-muted, #F8F6F0);
  padding: 10px 12px;
  text-align: left;
  font-weight: 700;
  font-size: 11px;
  color: var(--c-ink-muted, #666);
  border-bottom: 1px solid var(--c-border, #EAE6DF);
}

.tenders-table td {
  padding: 12px;
  border-bottom: 1px solid var(--c-border, #EAE6DF);
  vertical-align: middle;
}

.tenders-table tr:last-child td {
  border-bottom: none;
}

.td-code code {
  font-family: var(--f-mono, monospace);
  font-size: 11px;
  padding: 2px 6px;
  background: var(--c-surface-muted, #F8F6F0);
  border-radius: 4px;
}

.badge-penawar {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.badge-penawar--good {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.badge-penawar--low {
  background: rgba(220, 38, 38, 0.12);
  color: #DC2626;
}

.hint-monopoli {
  display: block;
  font-size: 10px;
  color: #DC2626;
  margin-top: 2px;
  font-weight: 600;
}

.td-ratio {
  font-size: 10px;
  color: var(--c-ink-muted, #666);
  margin-top: 2px;
}

.td-date {
  font-size: 11px;
  color: var(--c-ink-muted, #666);
  line-height: 1.4;
}

.td-actions {
  display: flex;
  gap: 6px;
}

.btn-edit-sm,
.btn-del-sm {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--c-border, #EAE6DF);
  background: var(--c-surface, #FFF);
  transition: all 0.15s ease;
}

.btn-edit-sm {
  color: var(--c-ink, #111);
}

.btn-edit-sm:hover {
  background: var(--c-surface-muted, #F8F6F0);
}

.btn-del-sm {
  color: #DC2626;
  border-color: rgba(220, 38, 38, 0.3);
}

.btn-del-sm:hover {
  background: rgba(220, 38, 38, 0.08);
}

.tender-form-card {
  padding: 16px;
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: 8px;
  background: var(--c-surface-muted, #FDFBF7);
  margin-top: 16px;
}

.form-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.form-card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--c-ink, #111);
  margin: 0;
}

.btn-cancel-form {
  background: transparent;
  border: none;
  font-size: 11px;
  color: var(--c-ink-muted, #666);
  cursor: pointer;
  text-decoration: underline;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--c-ink, #111);
  margin-bottom: 6px;
}

.form-label .req {
  color: #DC2626;
}

.form-input {
  padding: 8px 12px;
  font-size: 12px;
  border: 1px solid var(--c-border, #EAE6DF);
  border-radius: 6px;
  background: var(--c-surface, #FFF);
  color: var(--c-ink, #111);
  outline: none;
}

.form-input:focus {
  border-color: var(--c-ink, #111);
}

.field-hint {
  font-size: 10px;
  color: var(--c-ink-muted, #666);
  margin-top: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.btn-cancel {
  padding: 6px 14px;
  font-size: 12px;
  background: var(--c-surface, #FFF);
  border: 1px solid var(--c-border, #EAE6DF);
  border-radius: 6px;
  color: var(--c-ink, #111);
  cursor: pointer;
}

.btn-submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  background: var(--c-ink, #111);
  color: #FFF;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px;
  border-top: 1px solid var(--c-border, #EAE6DF);
  background: var(--c-surface-muted, #F8F6F0);
}

.btn-close-foot {
  padding: 6px 16px;
  font-size: 12px;
  background: var(--c-surface, #FFF);
  border: 1px solid var(--c-border, #EAE6DF);
  border-radius: 6px;
  cursor: pointer;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
