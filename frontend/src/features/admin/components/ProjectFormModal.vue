<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="modalTitleId">
      <!-- Modal Header -->
      <div class="modal-head">
        <div class="modal-head-info">
          <span class="badge-dummy">INPUT DATA MANUAL</span>
          <h3 :id="modalTitleId" class="modal-title">
            {{ isEdit ? 'Ubah Data Proyek Manual' : 'Tambah Proyek Pengawasan Baru' }}
          </h3>
          <p class="modal-sub">
            Data dicatat dengan label <code>asal_data = 'manual_admin'</code> dan diaudit secara transparan di seluruh sistem.
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
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#B45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div class="alert-content">
          <div class="alert-title">PENGESAHAN INTEGRITAS DATA :</div>
          <p>
            Proyek ini akan ditandai dengan label "Input Admin" secara permanen, skor risiko dihitung secara otomatis oleh backend setelah data tersimpan, tanpa manipulasi manual di browser.
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
              placeholder="2026"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="proj-source">
              SUMBER DANA
            </label>
            <input
              id="proj-source"
              v-model="form.sumber_dana"
              type="text"
              class="form-input"
              placeholder="APBD Provinsi Lampung"
            />
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
              step="1"
              placeholder="Contoh: 7500000000"
              required
            />
            <span v-if="form.pagu" class="form-hint">
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
              step="1"
              placeholder="Contoh: 7420000000"
            />
            <span v-if="form.hps" class="form-hint">
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

        <!-- Pengaturan Tambahan (Opsional) -->
        <div class="optional-toggle-wrap">
          <button
            type="button"
            class="btn-toggle-optional"
            @click="showOptionalFields = !showOptionalFields"
          >
            <span class="toggle-icon">{{ showOptionalFields ? '−' : '+' }}</span>
            <span>{{ showOptionalFields ? 'Sembunyikan Pengaturan Tambahan' : 'Pengaturan Tambahan (Metode, Koordinat, Deskripsi)' }}</span>
          </button>
        </div>

        <div v-show="showOptionalFields" class="optional-fields-box">
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
            </div>
          </div>

          <div class="form-group full-width" style="margin-top: 12px;">
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
import { useToast } from '@/composables/useToast'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  project: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const toast = useToast()

const modalTitleId = 'project-modal-title'
const submitting = ref(false)
const errorMsg = ref('')
const successFeedback = ref(null)
const showOptionalFields = ref(false)

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
      sumber_dana: props.project.sumber_dana || 'APBD Provinsi Lampung',
      metode_pemilihan: props.project.metode_pemilihan || 'Tender',
      lat: props.project.lat || null,
      lng: props.project.lng || null,
      deskripsi: props.project.deskripsi || '',
    }
    showOptionalFields.value = Boolean(
      props.project.lat ||
      props.project.lng ||
      props.project.deskripsi ||
      (props.project.metode_pemilihan && props.project.metode_pemilihan !== 'Tender')
    )
  } else {
    form.value = {
      nama: '',
      dinas: '',
      kode_bps: '1871',
      tahun_anggaran: 2026,
      pagu: null,
      hps: null,
      sumber_dana: 'APBD Provinsi Lampung',
      metode_pemilihan: 'Tender',
      lat: null,
      lng: null,
      deskripsi: '',
    }
    showOptionalFields.value = false
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

    const proj = res.project || res.data || {}
    const skorSesudahVal = res.skor_sesudah ?? (proj.skor_total != null ? Number(proj.skor_total) : (proj.score != null ? Number(proj.score) : 50))
    const kategoriVal = res.kategori || proj.kategori || 'Perlu Perhatian'

    successFeedback.value = {
      skor_sebelum: res.skor_sebelum ?? (props.project?.skor_total || 0),
      skor_sesudah: skorSesudahVal,
      kategori: kategoriVal,
    }

    toast.success(
      isEdit.value
        ? `Perubahan proyek berhasil disimpan (Skor risiko: ${skorSesudahVal}).`
        : `Proyek baru berhasil ditambahkan (Skor risiko: ${skorSesudahVal}).`,
      'Proyek Tersimpan',
    )

    emit('saved', { ...res, skor_sesudah: skorSesudahVal })
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
    toast.error(errorMsg.value, 'Gagal Menyimpan Proyek')
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
  max-width: 680px;
  max-height: 90vh;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 20px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 28px 16px;
  border-bottom: none;
}

.modal-head-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge-dummy {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 4px 12px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #92400E;
  background: #FEF3C7;
  border: 1px solid #FDE68A;
  border-radius: 999px;
  margin-bottom: 6px;
}

.modal-title {
  margin: 0 0 6px 0;
  font-size: 21px;
  font-weight: 800;
  color: #111827;
  line-height: 1.25;
}

.modal-sub {
  margin: 0;
  font-size: 12px;
  color: #6B7280;
  line-height: 1.45;
}

.modal-sub code {
  font-size: 11px;
  font-family: inherit;
  font-weight: 600;
  color: #111827;
  background: #F3F4F6;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #F3F4F6;
  border: none;
  border-radius: 8px;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-close:hover {
  background: #E5E7EB;
  color: #111827;
}

.modal-alert-integrity {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 0 28px 14px;
  padding: 14px 16px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 12px;
}

.alert-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.alert-content {
  font-size: 11.5px;
  line-height: 1.5;
  color: #92400E;
}

.alert-title {
  font-weight: 700;
  color: #78350F;
  margin-bottom: 4px;
  letter-spacing: 0.02em;
}

.alert-content p {
  margin: 0;
}

.modal-alert-error {
  margin: 0 28px 14px;
  padding: 10px 14px;
  background: var(--c-danger-soft, #FCE4DF);
  border: 1px solid #F5C6CB;
  border-radius: 10px;
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
  margin: 0 28px 14px;
  padding: 10px 14px;
  background: var(--c-success-soft, #E3F2EA);
  border: 1px solid #C3E6CB;
  border-radius: 10px;
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
  padding: 0 28px 20px;
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
  letter-spacing: 0.02em;
  color: #4B5563;
  text-transform: uppercase;
}

.req {
  color: #EF4444;
  margin-left: 2px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  font-family: inherit;
  font-size: 12px;
  color: #111827;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 0 14px;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-input,
.form-select {
  height: 42px;
}

.form-select {
  appearance: none;
  -webkit-appearance: none;
  background-color: #FFFFFF;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 14px;
  padding-right: 34px;
}

.form-textarea {
  padding: 10px 14px;
  resize: vertical;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #ff5c00;
  box-shadow: 0 0 0 3px rgba(255, 92, 0, 0.1);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #9CA3AF;
}

.optional-toggle-wrap {
  margin-top: 2px;
}

.btn-toggle-optional {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: #6B7280;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.15s ease;
}

.btn-toggle-optional:hover {
  color: #ff5c00;
}

.toggle-icon {
  font-weight: 700;
  font-size: 13px;
}

.optional-fields-box {
  padding: 14px;
  background: #F9FAFB;
  border: 1px dashed #E5E7EB;
  border-radius: 10px;
}

.coord-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.form-hint {
  font-size: 10px;
  color: #6B7280;
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
  gap: 12px;
  padding: 18px 28px;
  border-top: 1px solid #F3F4F6;
  background: #FFFFFF;
}

.btn-cancel {
  height: 42px;
  padding: 0 24px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover:not(:disabled) {
  background: #F9FAFB;
  border-color: #D1D5DB;
}

.btn-save {
  height: 42px;
  padding: 0 24px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: #FFFFFF;
  background: #ff5c00;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 92, 0, 0.25);
  transition: background 0.15s ease;
}

.btn-save:hover:not(:disabled) {
  background: #e65300;
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
