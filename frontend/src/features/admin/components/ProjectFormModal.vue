<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="modalTitleId">
      <!-- Modal Header -->
      <div class="modal-head">
        <div class="modal-head-info">
          <span class="badge-dummy">INPUT DATA MANUAL (SRC-10 / DR-01)</span>
          <h3 :id="modalTitleId" class="modal-title">
            {{ isEdit ? 'Ubah Data Proyek Manual' : 'Tambah Proyek Pengawasan Baru' }}
          </h3>
          <p class="modal-sub">
            Data dicatat dengan label <code>asal_data = 'manual_admin'</code> dan diaudit secara transparan di seluruh sistem (SRS §9.2).
          </p>
        </div>
        <button class="btn-close" aria-label="Tutup modal" @click="close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Warning Integrity Data -->
      <div class="modal-alert-integrity">
        <div class="alert-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        <div class="alert-content">
          <strong>PENGESAHAN INTEGRITAS DATA (SRS DR-01 &amp; DR-09):</strong>
          <p>
            Proyek ini akan ditandai dengan label "Input Admin" secara permanen.
            Sesuai aturan FR-17, <em>skor risiko dihitung secara otomatis oleh backend</em> setelah data tersimpan, tanpa manipulasi manual di browser.
          </p>
        </div>
      </div>

      <!-- Alert Error -->
      <div v-if="errorMsg" class="modal-alert-error">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>{{ errorMsg }}</p>
      </div>

      <!-- Alert Success Info (Dampak Skor) -->
      <div v-if="successFeedback" class="modal-alert-success">
        <div class="success-head">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <strong>Proyek Berhasil Disimpan:</strong>
        </div>
        <p>
          Skor risiko terhitung: <strong>{{ successFeedback.skor_sesudah ?? '—' }}</strong>
          <span v-if="successFeedback.kategori">({{ successFeedback.kategori }})</span>.
          Pergeseran nilai tercatat di Log Riwayat Nilai.
        </p>
      </div>

      <!-- Form Body -->
      <form id="project-form" class="modal-form" @submit.prevent="handleSubmit">
        <div class="form-group full-width">
          <label class="form-label" for="proj-name">
            NAMA PAKET PROYEK <span class="req">*</span>
          </label>
          <input
            id="proj-name"
            v-model="form.nama"
            type="text"
            class="form-input"
            placeholder="Contoh: Rekonstruksi Jalan Ryacudu (Metro - Tjg Karang)"
            required
            maxlength="255"
          />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="proj-dinas">
              INSTANSI / SKPD <span class="req">*</span>
            </label>
            <select id="proj-dinas" v-model="form.dinas" class="form-select" required>
              <option value="" disabled>Pilih Dinas / Instansi</option>
              <option v-for="d in dinasOptions" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="proj-region">
              WILAYAH (KABUPATEN / KOTA) <span class="req">*</span>
            </label>
            <select id="proj-region" v-model="form.kode_bps" class="form-select" required>
              <option value="" disabled>Pilih Wilayah BPS</option>
              <option v-for="r in regionOptions" :key="r.kode_bps" :value="r.kode_bps">
                {{ r.nama }} ({{ r.kode_bps }})
              </option>
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="proj-ta">
              TAHUN ANGGARAN (TA) <span class="req">*</span>
            </label>
            <input
              id="proj-ta"
              v-model.number="form.tahun_anggaran"
              type="number"
              class="form-input"
              min="2020"
              max="2035"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="proj-source">
              SUMBER DANA
            </label>
            <select id="proj-source" v-model="form.sumber_dana" class="form-select">
              <option value="APBD">APBD Provinsi Lampung</option>
              <option value="APBD Kab/Kota">APBD Kabupaten / Kota</option>
              <option value="APBN">APBN (Kementerian PUPR / DAK)</option>
              <option value="Pinjaman Daerah">Pinjaman Daerah / Lainnya</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="proj-pagu">
              PAGU ANGGARAN (RUPIAH) <span class="req">*</span>
            </label>
            <input
              id="proj-pagu"
              v-model.number="form.pagu"
              type="number"
              class="form-input"
              min="1"
              step="1000"
              placeholder="Contoh: 7500000000"
              required
            />
            <span class="form-hint">
              Nominal terformat: <strong>{{ formatCurrency(form.pagu) }}</strong>
            </span>
          </div>

          <div class="form-group">
            <label class="form-label" for="proj-hps">
              HPS / ESTIMASI PENGADAAN (RUPIAH)
            </label>
            <input
              id="proj-hps"
              v-model.number="form.hps"
              type="number"
              class="form-input"
              min="1"
              step="1000"
              placeholder="Contoh: 7420000000"
            />
            <span class="form-hint">
              Nominal terformat: <strong>{{ formatCurrency(form.hps) }}</strong>
            </span>
            <!-- Rentang Wajar (20% - 300% Pagu) Helper -->
            <div
              v-if="form.pagu && form.hps"
              class="range-indicator"
              :class="{ 'range-indicator--warn': !isHpsWajar }"
            >
              <div v-if="isHpsWajar" class="range-indicator-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Nilai HPS dalam rentang wajar (20% – 300% pagu).</span>
              </div>
              <div v-else class="range-indicator-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Peringatan: HPS di luar rentang wajar ({{ formatCurrency(minHpsWajar) }} s/d {{ formatCurrency(maxHpsWajar) }}). Backend akan menolak (HTTP 400).</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="proj-method">
              METODE PEMILIHAN PENYEDIA
            </label>
            <select id="proj-method" v-model="form.metode_pemilihan" class="form-select">
              <option value="Tender">Tender Terbuka / Pasca-kualifikasi</option>
              <option value="Seleksi">Seleksi Konsultan</option>
              <option value="e-Purchasing">e-Purchasing (Katalog Elektronik)</option>
              <option value="Pengadaan Langsung">Pengadaan Langsung</option>
              <option value="Penunjukan Langsung">Penunjukan Langsung (Darurat)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">
              KOORDINAT PETA (LAT, LNG)
            </label>
            <div class="coord-inputs">
              <input
                v-model.number="form.lat"
                type="number"
                step="0.0001"
                class="form-input"
                placeholder="Lat, mis: -5.385"
              />
              <input
                v-model.number="form.lng"
                type="number"
                step="0.0001"
                class="form-input"
                placeholder="Lng, mis: 105.297"
              />
            </div>
            <span class="form-hint">Wilayah Lampung: Lat -6.0 s/d -3.5, Lng 103.5 s/d 106.0</span>
          </div>
        </div>

        <div class="form-group full-width">
          <label class="form-label" for="proj-desc">
            DESKRIPSI / LINGKUP PEKERJAAN
          </label>
          <textarea
            id="proj-desc"
            v-model="form.deskripsi"
            rows="3"
            class="form-textarea"
            placeholder="Uraian singkat lingkup pekerjaan konstruksi, spesifikasi, atau catatan pengawasan..."
          />
        </div>
      </form>

      <!-- Modal Footer -->
      <div class="modal-foot">
        <button type="button" class="btn-cancel" :disabled="submitting" @click="close">
          Batal
        </button>
        <button
          type="submit"
          form="project-form"
          class="btn-save"
          :disabled="submitting"
        >
          <span v-if="submitting">Menyimpan Data…</span>
          <span v-else>{{ isEdit ? 'Simpan Perubahan' : 'Simpan Proyek Pengawasan' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { adminProjectsApi } from '@/services/api/admin-projects.api'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  project: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const modalTitleId = 'project-modal-title'
const submitting = ref(false)
const errorMsg = ref('')
const successFeedback = ref(null)

const isEdit = computed(() => Boolean(props.project?.id))

// Opsi SKPD Resmi
const dinasOptions = [
  'Dinas Bina Marga & Bina Konstruksi Prov. Lampung',
  'Dinas Pengelolaan Sumber Daya Air Prov. Lampung',
  'Dinas Perumahan, Kawasan Permukiman & Cipta Karya Prov. Lampung',
  'Dinas PU Kota Bandar Lampung',
  'Dinas PU Kabupaten Lampung Selatan',
  'Dinas PU Kabupaten Lampung Tengah',
  'Dinas PU Kabupaten Lampung Timur',
  'Dinas Kesehatan Provinsi Lampung',
  'Dinas Pendidikan dan Kebudayaan Provinsi Lampung',
  'Sekretariat Daerah Provinsi Lampung',
]

// Opsi Wilayah BPS Lampung (15 Kab/Kota)
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

const form = ref({
  nama: '',
  dinas: '',
  kode_bps: '',
  tahun_anggaran: 2026,
  pagu: null,
  hps: null,
  sumber_dana: 'APBD',
  metode_pemilihan: 'Tender',
  lat: null,
  lng: null,
  deskripsi: '',
})

// Rentang wajar HPS (20% – 300% dari pagu)
const minHpsWajar = computed(() => (form.value.pagu ? form.value.pagu * 0.2 : 0))
const maxHpsWajar = computed(() => (form.value.pagu ? form.value.pagu * 3.0 : 0))
const isHpsWajar = computed(() => {
  if (!form.value.pagu || !form.value.hps) return true
  return form.value.hps >= minHpsWajar.value && form.value.hps <= maxHpsWajar.value
})

function resetForm() {
  if (props.project) {
    form.value = {
      nama: props.project.nama || props.project.title || '',
      dinas: props.project.dinas || '',
      kode_bps: props.project.kode_bps || '1871',
      tahun_anggaran: props.project.tahun_anggaran || 2026,
      pagu: props.project.pagu || null,
      hps: props.project.hps || null,
      sumber_dana: props.project.sumber_dana || 'APBD',
      metode_pemilihan: props.project.metode_pemilihan || 'Tender',
      lat: props.project.lat || null,
      lng: props.project.lng || null,
      deskripsi: props.project.deskripsi || '',
    }
  } else {
    form.value = {
      nama: '',
      dinas: '',
      kode_bps: '1871',
      tahun_anggaran: 2026,
      pagu: null,
      hps: null,
      sumber_dana: 'APBD',
      metode_pemilihan: 'Tender',
      lat: null,
      lng: null,
      deskripsi: '',
    }
  }
  errorMsg.value = ''
  successFeedback.value = null
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) resetForm()
  },
  { immediate: true },
)

function close() {
  emit('update:modelValue', false)
}

async function handleSubmit() {
  submitting.value = true
  errorMsg.value = ''
  successFeedback.value = null

  try {
    const payload = { ...form.value }
    // Pastikan tidak ada skor_total yang dikirim (dijamin juga di API service)
    delete payload.skor_total
    delete payload.kategori

    let res
    if (isEdit.value) {
      res = await adminProjectsApi.update(props.project.id, payload)
    } else {
      res = await adminProjectsApi.create(payload)
    }

    successFeedback.value = {
      skor_sebelum: res.skor_sebelum ?? (props.project?.skor_total || 0),
      skor_sesudah: res.skor_sesudah ?? (res.data?.skor_total || res.data?.score || 50),
      kategori: res.kategori || res.data?.kategori || 'Perlu Perhatian',
    }

    emit('saved', res)
    // Beri jeda 800ms agar user melihat feedback skor sebelum modal ditutup
    setTimeout(() => {
      close()
    }, 900)
  } catch (err) {
    if (err.response?.status === 400) {
      errorMsg.value = err.response?.data?.message || 'Nilai pagu atau HPS di luar batas rentang wajar (20% – 300%).'
    } else if (err.response?.status === 409) {
      errorMsg.value = err.response?.data?.message || 'Bentrok kode unik proyek dengan data ETL.'
    } else {
      errorMsg.value = err.message || 'Gagal menyimpan proyek. Periksa koneksi dan coba lagi.'
    }
  } finally {
    submitting.value = false
  }
}
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
  max-width: 720px;
  max-height: 90vh;
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
  padding: 20px 24px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
}

.modal-head-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge-dummy {
  display: inline-block;
  align-self: flex-start;
  padding: 3px 8px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--c-warning, #D97706);
  background: var(--c-warning-soft, #FDF0D8);
  border: 1px solid #FCD34D;
  border-radius: var(--r-xs, 4px);
  margin-bottom: 4px;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--c-ink, #111111);
  line-height: 1.3;
}

.modal-sub {
  margin: 0;
  font-size: 11px;
  color: var(--c-muted, #6B6760);
  line-height: 1.4;
}

.modal-sub code {
  font-size: 10.5px;
  color: var(--c-ink, #111111);
  background: var(--c-bg, #F4F2EE);
  padding: 2px 4px;
  border-radius: 3px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--c-muted, #6B6760);
  cursor: pointer;
  padding: 4px 8px;
}

.modal-alert-integrity {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 16px 24px 0;
  padding: 12px 14px;
  background: var(--c-warning-soft, #FDF0D8);
  border: 1px solid #FCD34D;
  border-radius: var(--r-sm, 6px);
  font-size: 11px;
  line-height: 1.45;
  color: #78350F;
}

.alert-icon {
  font-weight: bold;
}

.alert-content p {
  margin: 3px 0 0;
}

.modal-alert-error {
  margin: 16px 24px 0;
  padding: 10px 14px;
  background: var(--c-danger-soft, #FCE4DF);
  border: 1px solid #F5C6CB;
  border-radius: var(--r-sm, 6px);
  font-size: 11px;
  color: var(--c-danger, #D63A1F);
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-alert-error p {
  margin: 0;
}

.modal-alert-success {
  margin: 16px 24px 0;
  padding: 10px 14px;
  background: var(--c-success-soft, #E3F2EA);
  border: 1px solid #C3E6CB;
  border-radius: var(--r-sm, 6px);
  font-size: 11px;
  color: #155724;
}

.success-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-alert-success p {
  margin: 3px 0 0;
}

.modal-form {
  padding: 16px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.full-width {
  width: 100%;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--c-ink, #111111);
}

.req {
  color: var(--c-danger, #D63A1F);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  font-family: inherit;
  font-size: 11px;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: var(--r-sm, 6px);
  padding: 0 10px;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
}

.form-input,
.form-select {
  height: 38px;
}

.form-textarea {
  padding: 8px 10px;
  resize: vertical;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--c-primary, #FF6B2B);
}

.coord-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.form-hint {
  font-size: 10px;
  color: var(--c-muted, #6B6760);
}

.range-indicator {
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--c-success-soft, #E3F2EA);
  color: #155724;
  margin-top: 2px;
}

.range-indicator--warn {
  background: var(--c-warning-soft, #FDF0D8);
  color: #B45309;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--c-border, #E7E3DC);
  background: var(--c-bg-alt, #F8F7F4);
}

.btn-cancel {
  height: 38px;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

.btn-save {
  height: 38px;
  padding: 0 20px;
  font-size: 11px;
  font-weight: 700;
  /* Aksesibilitas WCAG AA 6.65:1 (teks ink bold di latar oranye) */
  color: var(--c-ink, #111111);
  background: var(--c-primary, #FF6B2B);
  border: none;
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

.btn-save:hover:not(:disabled) {
  opacity: 0.92;
}

.btn-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .form-grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
