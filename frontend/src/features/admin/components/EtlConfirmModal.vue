<template>
  <div v-if="open" class="etl-modal-backdrop" @click.self="$emit('close')">
    <div class="etl-modal-card" role="dialog" aria-modal="true" aria-labelledby="etl-modal-title">
      <!-- Header -->
      <div class="etl-modal-head">
        <div class="etl-modal-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </div>
        <div>
          <h3 id="etl-modal-title" class="etl-modal-title">Pipa Data &amp; ETL Publik</h3>
          <p class="etl-modal-target">Sumber Target: <strong>{{ source?.nama || 'Sumber Data' }}</strong> (<code>{{ source?.source_id }}</code>)</p>
        </div>
        <button class="etl-modal-close" aria-label="Tutup" @click="$emit('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Mode Selector Tabs -->
      <div class="etl-tabs-mode">
        <button
          type="button"
          class="etl-tab-btn"
          :class="{ 'is-active': activeMode === 'upload' }"
          @click="activeMode = 'upload'"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Unggah Berkas Resmi (CSV/JSON)</span>
        </button>
        <button
          type="button"
          class="etl-tab-btn"
          :class="{ 'is-active': activeMode === 'sample' }"
          @click="activeMode = 'sample'"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Uji Coba Sampel SiRUP</span>
        </button>
        <button
          v-if="source?.boleh_otomatis"
          type="button"
          class="etl-tab-btn"
          :class="{ 'is-active': activeMode === 'auto' }"
          @click="activeMode = 'auto'"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Sinkronisasi Otomatis</span>
        </button>
      </div>

      <!-- Mode 1: Upload File Ekspor Resmi -->
      <div v-if="activeMode === 'upload'" class="etl-mode-body">
        <div class="etl-upload-dropzone" :class="{ 'is-dragover': isDragOver }" @dragover.prevent="isDragOver = true" @dragleave.prevent="isDragOver = false" @drop.prevent="onFileDrop">
          <input
            id="etl-file-input"
            ref="fileInputRef"
            type="file"
            accept=".csv,text/csv,application/json,.json"
            class="etl-file-hidden"
            @change="onFileSelected"
          />
          <div class="etl-dropzone-content">
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="upload-icon">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <polyline points="9 15 12 12 15 15"></polyline>
            </svg>
            <div v-if="!selectedFile">
              <p class="dropzone-text">Tarik &amp; lepas berkas hasil unduhan portal di sini, atau</p>
              <button type="button" class="btn-browse" @click="triggerBrowse">Pilih Berkas CSV / JSON</button>
            </div>
            <div v-else class="dropzone-file-selected">
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
              <button type="button" class="btn-remove-file" @click="clearFile">Ganti Berkas</button>
            </div>
          </div>
        </div>

        <div class="etl-modal-box is-info-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div class="info-text">
            <strong>Sumber Resmi:</strong> Unduh berkas ekspor tabel RUP dari SiRUP LKPP (<code>sirup.inaproc.id</code>) atau daftar lelang SPSE LPSE Lampung, lalu unggah di sini. Seluruh kolom akan dipetakan, divalidasi, dan dihitung risikonya secara otomatis.
          </div>
        </div>
      </div>

      <!-- Mode 2: Sampel Simulasi SiRUP Lampung -->
      <div v-else-if="activeMode === 'sample'" class="etl-mode-body">
        <div class="etl-sample-preview">
          <div class="sample-head">
            <span class="sample-tag">DATASET SAMPEL PEMPROV LAMPUNG 2026</span>
            <span class="sample-rows">3 Paket Pengadaan Nyata</span>
          </div>
          <pre class="sample-code">kode_rup,kode_tender,nama_paket,satker,kode_bps,pagu,hps...
1. RUP-2026-LMP-0201: Peningkatan Kapasitas Jalan Pangeran Antasari (Rp 4,50 M)
2. RUP-2026-LMP-0202: Rehabilitasi Saluran Irigasi Way Curup (Rp 3,20 M)
3. RUP-2026-LMP-0203: Pembangunan Laboratorium LH Prov. Lampung (Rp 2,80 M)</pre>
        </div>

        <div class="etl-modal-box is-info-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div class="info-text">
            <strong>Uji Coba 1-Klik:</strong> Mode ini langsung mengirimkan paket data sampel SiRUP Lampung yang sudah tervalidasi ke pipa ETL backend. Anda dapat langsung mengamati proses validasi, pencocokan auto-match, dan skor risiko tanpa harus menyiapkan berkas ekspor terlebih dahulu.
          </div>
        </div>
      </div>

      <!-- Mode 3: Direct Auto-Fetch -->
      <div v-else-if="activeMode === 'auto'" class="etl-mode-body">
        <div class="etl-modal-box is-compliance">
          <div class="etl-compliance-item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span><strong>Kepatuhan Lisensi:</strong> {{ source?.lisensi || 'Open Data Terbuka' }}</span>
          </div>
          <div class="etl-compliance-item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span><strong>Izin Akses:</strong> Pengambilan Otomatis Diizinkan (ToS)</span>
          </div>
        </div>

        <div class="etl-modal-box is-estimate">
          <h4 class="etl-box-heading">Estimasi Dampak Eksekusi:</h4>
          <ul class="etl-list">
            <li>Konektor membaca endpoint resmi yang didaftarkan.</li>
            <li>Validasi skema ketat terhadap atribut wajib LKPP/INAPROC.</li>
            <li>Penyelarasan paket tender SPSE dijalankan ulang secara otomatis.</li>
          </ul>
        </div>
      </div>

      <!-- Audit Notice -->
      <div class="etl-modal-box is-audit">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p class="etl-audit-text">
          <strong>Tercatat di Log Audit:</strong> Eksekusi pipa data dicatat atas nama <em>{{ adminName }}</em>.
        </p>
      </div>

      <!-- Error Message -->
      <div v-if="errorMsg" class="etl-modal-box is-result is-danger">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>{{ errorMsg }}</p>
      </div>

      <!-- Result Banner if finished -->
      <div v-if="result" class="etl-modal-box is-result" :class="result.status === 'failed' ? 'is-danger' : 'is-success'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <div>
          <strong>Hasil Eksekusi ETL:</strong>
          <p>{{ result.total_rows }} baris diproses ({{ result.accepted }} berhasil diterima, {{ result.rejected }} ditolak/anomali).</p>
        </div>
      </div>

      <!-- Actions Footer -->
      <div class="etl-modal-actions">
        <button class="etl-btn-cancel" :disabled="submitting" @click="$emit('close')">
          {{ result ? 'Tutup' : 'Batal' }}
        </button>
        <button
          v-if="!result"
          class="etl-btn-run"
          :disabled="submitting || (activeMode === 'upload' && !selectedFile)"
          @click="handleSubmit"
        >
          <svg v-if="!submitting" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>{{ submitting ? 'Memproses Pipeline…' : getSubmitLabel() }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  source: { type: Object, default: null },
  adminName: { type: String, default: 'Admin' },
})

const emit = defineEmits(['close', 'executed'])

const activeMode = ref('upload')
const isDragOver = ref(false)
const selectedFile = ref(null)
const fileInputRef = ref(null)
const submitting = ref(false)
const result = ref(null)
const errorMsg = ref('')

const SAMPLE_CSV = `kode_rup,kode_tender,nama_paket,satker,kode_bps,tahun_anggaran,pagu,hps,sumber_dana,metode_pemilihan,tgl_pembuatan_rup
RUP-2026-LMP-0201,TDR-2026-LMP-0201,Peningkatan Kapasitas Jalan Pangeran Antasari,Dinas Bina Marga & Bina Konstruksi Prov. Lampung,1871,2026,4500000000,4380000000,APBD,Tender Terbuka,2026-02-10
RUP-2026-LMP-0202,TDR-2026-LMP-0202,Rehabilitasi Saluran Irigasi Way Curup Kalianda,Dinas Pengelolaan Sumber Daya Air Prov. Lampung,1803,2026,3200000000,3120000000,APBD,Tender Terbuka,2026-02-18
RUP-2026-LMP-0203,TDR-2026-LMP-0203,Pembangunan Gedung Laboratorium Lingkungan Hidup,Dinas Lingkungan Hidup Prov. Lampung,1871,2026,2800000000,2740000000,APBD,Tender Terbuka,2026-03-01`

function triggerBrowse() {
  fileInputRef.value?.click()
}

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (file) {
    selectedFile.value = file
    errorMsg.value = ''
  }
}

function onFileDrop(e) {
  isDragOver.value = false
  const file = e.dataTransfer.files?.[0]
  if (file) {
    selectedFile.value = file
    errorMsg.value = ''
  }
}

function clearFile() {
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getSubmitLabel() {
  if (activeMode.value === 'upload') return 'Unggah & Proses Berkas'
  if (activeMode.value === 'sample') return 'Jalankan Sampel SiRUP'
  return 'Jalankan Sinkronisasi'
}

async function handleSubmit() {
  submitting.value = true
  result.value = null
  errorMsg.value = ''

  const payload = {
    source_id: props.source?.source_id,
    mode: activeMode.value,
    file: activeMode.value === 'upload' ? selectedFile.value : null,
    csv_content: activeMode.value === 'sample' ? SAMPLE_CSV : '',
    onSuccess: (res) => {
      result.value = res
      submitting.value = false
    },
    onError: (err) => {
      errorMsg.value = err.response?.data?.message || err.message || 'Eksekusi pipa ETL gagal'
      submitting.value = false
    },
  }

  emit('executed', payload)
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      activeMode.value = props.source?.boleh_otomatis ? 'auto' : 'upload'
      selectedFile.value = null
      submitting.value = false
      result.value = null
      errorMsg.value = ''
    }
  },
)
</script>

<style scoped>
.etl-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 16px;
}

.etl-modal-card {
  width: 100%;
  max-width: 580px;
  background: var(--c-surface, #FFF);
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: var(--r-xl, 12px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
}

.etl-modal-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}

.etl-modal-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--c-surface-muted, #F4F2EE);
  color: var(--c-ink, #111);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.etl-modal-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--c-ink, #111);
  margin: 0;
}

.etl-modal-target {
  font-size: 12px;
  color: var(--c-ink-muted, #666);
  margin: 3px 0 0 0;
}

.etl-modal-target code {
  font-family: var(--f-mono, monospace);
  font-size: 11px;
  background: var(--c-surface-muted, #F4F2EE);
  padding: 2px 6px;
  border-radius: 4px;
}

.etl-modal-close {
  position: absolute;
  top: 0;
  right: 0;
  background: none;
  border: none;
  color: var(--c-ink-muted, #666);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.etl-modal-close:hover {
  background: var(--c-surface-muted, #F4F2EE);
  color: var(--c-ink, #111);
}

.etl-tabs-mode {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--c-border, #EAE6DF);
  padding-bottom: 8px;
}

.etl-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--c-ink-muted, #666);
  cursor: pointer;
  transition: all 0.15s ease;
}

.etl-tab-btn:hover {
  background: var(--c-surface-muted, #F4F2EE);
  color: var(--c-ink, #111);
}

.etl-tab-btn.is-active {
  background: var(--c-ink, #111);
  color: #FFF;
  border-color: var(--c-ink, #111);
}

.etl-mode-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.etl-upload-dropzone {
  border: 2px dashed var(--c-border-strong, #DCD8D0);
  border-radius: 8px;
  padding: 24px 16px;
  text-align: center;
  background: var(--c-surface-muted, #FDFBF7);
  transition: all 0.15s ease;
}

.etl-upload-dropzone.is-dragover {
  border-color: var(--c-ink, #111);
  background: rgba(0, 0, 0, 0.02);
}

.etl-file-hidden {
  display: none;
}

.etl-dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  color: var(--c-ink-muted, #666);
}

.dropzone-text {
  font-size: 12px;
  color: var(--c-ink-muted, #666);
  margin: 0 0 8px;
}

.btn-browse {
  display: inline-block;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  background: var(--c-surface, #FFF);
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: 6px;
  color: var(--c-ink, #111);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-browse:hover {
  border-color: var(--c-ink, #111);
}

.dropzone-file-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.file-name {
  font-weight: 700;
  color: var(--c-ink, #111);
}

.file-size {
  color: var(--c-ink-muted, #666);
}

.btn-remove-file {
  background: transparent;
  border: none;
  font-size: 11px;
  color: #DC2626;
  cursor: pointer;
  text-decoration: underline;
}

.etl-sample-preview {
  border: 1px solid var(--c-border, #EAE6DF);
  border-radius: 8px;
  padding: 12px;
  background: var(--c-surface-muted, #FDFBF7);
}

.sample-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sample-tag {
  font-family: var(--f-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  color: #059669;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.sample-rows {
  font-size: 11px;
  color: var(--c-ink-muted, #666);
}

.sample-code {
  font-family: var(--f-mono, monospace);
  font-size: 11px;
  line-height: 1.5;
  color: var(--c-ink, #111);
  margin: 0;
  white-space: pre-wrap;
  background: var(--c-surface, #FFF);
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--c-border, #EAE6DF);
}

.etl-modal-box {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 11px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.etl-modal-box.is-info-box {
  background: var(--c-surface-muted, #F8F6F0);
  border: 1px solid var(--c-border, #EAE6DF);
  color: var(--c-ink, #111);
}

.info-icon {
  flex: none;
  color: var(--c-ink-muted, #666);
  margin-top: 1px;
}

.info-text strong {
  color: var(--c-ink, #111);
}

.etl-modal-box.is-compliance {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #065F46;
}

.etl-compliance-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.etl-modal-box.is-estimate {
  background: var(--c-surface-muted, #F8F6F0);
  border: 1px solid var(--c-border, #EAE6DF);
  flex-direction: column;
}

.etl-box-heading {
  font-size: 11px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--c-ink, #111);
}

.etl-list {
  margin: 0;
  padding-left: 18px;
  color: var(--c-ink-muted, #666);
  line-height: 1.5;
}

.etl-modal-box.is-audit {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #B45309;
}

.etl-audit-text {
  margin: 0;
  line-height: 1.4;
}

.etl-modal-box.is-result.is-success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #065F46;
}

.etl-modal-box.is-result.is-danger {
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.3);
  color: #DC2626;
}

.etl-modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.etl-btn-cancel {
  height: 38px;
  padding: 0 16px;
  background: var(--c-surface, #FFF);
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-ink, #111);
  cursor: pointer;
}

.etl-btn-run {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  background: var(--c-ink, #111);
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #FFF;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.etl-btn-run:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
