<template>
  <section class="report-page">
    <header class="report-head">
      <h1>Buat Laporan Warga</h1>
      <p>Laporkan masalah infrastruktur atau indikasi penyelewengan dana dengan aman.</p>
    </header>

    <div class="report-grid">
      <!-- ============ Form ============ -->
      <form class="report-form" @submit.prevent="submit">
        <div>
          <label class="visually-hidden" for="r-title">Judul laporan</label>
          <input
            id="r-title"
            v-model.trim="form.title"
            class="field"
            type="text"
            placeholder="Judul Laporan Singkat..."
            required
            maxlength="120"
          />
        </div>

        <!-- Pilih proyek (bisa diketik untuk mencari) -->
        <div class="combo">
          <label class="visually-hidden" for="r-project">Proyek terkait</label>
          <input
            id="r-project"
            v-model="projectQuery"
            class="field field--combo"
            type="text"
            role="combobox"
            autocomplete="off"
            aria-autocomplete="list"
            aria-controls="r-project-list"
            :aria-expanded="comboOpen"
            placeholder="Pilih Proyek Terkait (Ketik untuk mencari dari Peta Proyek)..."
            required
            @focus="comboOpen = true"
            @input="onProjectInput"
            @keydown="onProjectKeydown"
            @blur="comboOpen = false"
          />
          <svg class="combo-chevron" :class="{ 'combo-chevron--open': comboOpen }" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
          <ul v-if="comboOpen" id="r-project-list" class="combo-list" role="listbox">
            <li v-if="projectsStore.loading" class="combo-empty">Memuat daftar proyek…</li>
            <li v-else-if="!filteredProjects.length" class="combo-empty">Proyek tidak ditemukan</li>
            <li
              v-for="(p, i) in filteredProjects"
              :key="p.id"
              class="combo-item"
              :class="{ 'combo-item--active': i === activeIndex }"
              role="option"
              :aria-selected="p.id === form.projectId"
              @mousedown.prevent="selectProject(p)"
              @mousemove="activeIndex = i"
            >
              <span class="combo-name">{{ p.name }}</span>
              <span v-if="p.location" class="combo-sub">{{ p.location }}</span>
            </li>
          </ul>
        </div>

        <!-- Kategori masalah -->
        <div class="chip-row" role="radiogroup" aria-label="Kategori masalah">
          <span class="chip-label">Kategori Masalah:</span>
          <button
            v-for="c in categories"
            :key="c.value"
            type="button"
            class="chip"
            :class="{ 'chip--active': form.category === c.value }"
            role="radio"
            :aria-checked="form.category === c.value"
            @click="form.category = c.value"
          >
            {{ c.label }}
          </button>
        </div>

        <div>
          <label class="visually-hidden" for="r-desc">Detail laporan</label>
          <textarea
            id="r-desc"
            v-model.trim="form.description"
            class="field field--area"
            rows="5"
            minlength="20"
            placeholder="Detail kronologi kejadian atau rincian masalah yang ditemukan..."
            required
          />
        </div>

        <!-- Unggah bukti -->
        <div>
          <label
            class="dropzone"
            :class="{ 'dropzone--drag': dragging }"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="onDrop"
          >
            <input
              class="visually-hidden"
              type="file"
              multiple
              accept=".jpg,.jpeg,.mp4,image/jpeg,video/mp4"
              @change="onPick"
            />
            <span class="dropzone-title">Upload Foto / Video Bukti</span>
            <span class="dropzone-sub">Wajib minimal 1 berkas · maksimal 5MB per berkas (Format: JPG, MP4)</span>
          </label>
          <ul v-if="files.length" class="file-list">
            <li v-for="(f, i) in files" :key="f.name + f.size" class="file-item">
              <span class="file-name">{{ f.name }}</span>
              <span class="file-size">{{ formatSize(f.size) }}</span>
              <button type="button" class="file-remove" :aria-label="`Hapus ${f.name}`" @click="removeFile(i)">×</button>
            </li>
          </ul>
          <p v-if="fileError" class="file-error" role="alert">{{ fileError }}</p>
        </div>

        <!-- Anonim -->
        <label class="toggle-row">
          <input v-model="form.anonymous" class="switch-input" type="checkbox" role="switch" />
          <span class="switch" aria-hidden="true"></span>
          <span class="toggle-text">
            <strong>Kirim sebagai Anonim</strong>
            <small>Identitas profil Anda akan disembunyikan dari publik.</small>
          </span>
        </label>

        <div v-if="!form.anonymous">
          <label class="visually-hidden" for="r-contact">Kontak (opsional)</label>
          <input
            id="r-contact"
            v-model.trim="form.contact"
            class="field"
            type="text"
            placeholder="Kontak yang bisa dihubungi (opsional)"
          />
        </div>

        <div class="submit-row">
          <button class="btn-submit" type="submit" :disabled="sending || projectsStore.usingDemoData">
            {{ sending ? 'Mengirim…' : 'Kirim Laporan' }}
          </button>
        </div>

        <p v-if="projectsStore.usingDemoData" class="notice notice--error" role="status">
          Backend belum terhubung. Pengiriman laporan dinonaktifkan saat menggunakan data simulasi.
        </p>
        <p v-else-if="message" class="notice" :class="`notice--${messageType}`" role="status">{{ message }}</p>

      </form>

      <!-- ============ Panel informasi ============ -->
      <aside class="report-side">
        <div class="side-card">
          <h2>Laporan yang kuat memuat</h2>
          <ul class="side-list">
            <li><span class="dot dot--green" aria-hidden="true"></span>Foto atau video bukti otentik dari lapangan</li>
            <li><span class="dot dot--green" aria-hidden="true"></span>Tautan yang tepat dengan data Peta Proyek</li>
          </ul>
        </div>

        <div class="side-card side-card--amber">
          <h2>Privasi Anda terlindungi</h2>
          <ul class="side-list">
            <li><span class="dot dot--square" aria-hidden="true"></span>Gunakan opsi anonim untuk keamanan identitas</li>
            <li><span class="dot dot--square" aria-hidden="true"></span>Proses verifikasi internal sebelum rilis publik</li>
          </ul>
        </div>

        <div class="side-card">
          <h2>Setelah Anda kirim</h2>
          <ol class="steps">
            <li>
              <span class="step-no">1</span>
              <div><strong>Dapatkan ID Tiket</strong><small>Gunakan ID ini di menu Lacak Laporan</small></div>
            </li>
            <li>
              <span class="step-no">2</span>
              <div><strong>Investigasi Admin</strong><small>Laporan diverifikasi oleh tim Clearsight</small></div>
            </li>
            <li>
              <span class="step-no">3</span>
              <div><strong>Tampil di Peta Proyek</strong><small>Status akan berubah jika terbukti valid</small></div>
            </li>
          </ol>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { reportsApi } from '@/services/api/reports.api'
import { useProjectsStore } from '@/stores/projects'

const route = useRoute()
const router = useRouter()
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB per berkas (sesuai batas backend)
const MAX_FILES = 5
const ALLOWED_EXT = ['jpg', 'jpeg', 'mp4']
const MAX_OPTIONS = 50

const categories = [
  { value: 'infrastructure', label: 'Infrastruktur' },
  { value: 'fund_flow', label: 'Aliran Dana' },
  { value: 'other', label: 'Lainnya' },
]

const projectsStore = useProjectsStore()

const form = reactive({
  title: '',
  projectId: '',
  category: 'infrastructure',
  description: '',
  anonymous: true,
  contact: '',
})
const sending = ref(false)
const message = ref('')
const messageType = ref('success')

// ---------- Combobox proyek ----------
const projectQuery = ref('')
const comboOpen = ref(false)
const activeIndex = ref(0)

const filteredProjects = computed(() => {
  const q = projectQuery.value.trim().toLowerCase()
  const list = projectsStore.projects || []
  const hasil = q
    ? list.filter((p) => `${p.name ?? ''} ${p.location ?? ''}`.toLowerCase().includes(q))
    : list
  return hasil.slice(0, MAX_OPTIONS)
})

function selectProject(p) {
  form.projectId = p.id
  projectQuery.value = p.name
  comboOpen.value = false
}

function onProjectInput() {
  // Mengetik berarti pilihan sebelumnya dibatalkan
  form.projectId = ''
  comboOpen.value = true
  activeIndex.value = 0
}

function onProjectKeydown(e) {
  const total = filteredProjects.value.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    comboOpen.value = true
    activeIndex.value = Math.min(total - 1, activeIndex.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(0, activeIndex.value - 1)
  } else if (e.key === 'Enter' && comboOpen.value && filteredProjects.value[activeIndex.value]) {
    e.preventDefault()
    selectProject(filteredProjects.value[activeIndex.value])
  } else if (e.key === 'Escape') {
    comboOpen.value = false
  }
}

// ---------- Unggah bukti ----------
const files = ref([])
const fileError = ref('')
const dragging = ref(false)

function addFiles(list) {
  const errors = []
  for (const f of list) {
    if (files.value.length >= MAX_FILES) {
      errors.push(`Maksimal ${MAX_FILES} berkas`)
      break
    }
    const ext = f.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) {
      errors.push(`${f.name}: format tidak didukung (hanya JPG, MP4)`)
      continue
    }
    if (f.size > MAX_FILE_BYTES) {
      errors.push(`${f.name}: melebihi 5MB`)
      continue
    }
    if (files.value.some((x) => x.name === f.name && x.size === f.size)) continue
    files.value.push(f)
  }
  fileError.value = errors.join('; ')
}

function onPick(e) {
  addFiles(Array.from(e.target.files || []))
  e.target.value = ''
}

function onDrop(e) {
  dragging.value = false
  addFiles(Array.from(e.dataTransfer?.files || []))
}

function removeFile(i) {
  files.value.splice(i, 1)
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// ---------- Kirim ----------
function setMessage(type, text) {
  messageType.value = type
  message.value = text
}

async function submit() {
  if (sending.value) return
  message.value = ''

  if (projectsStore.usingDemoData) {
    setMessage('error', 'Backend belum terhubung. Pengiriman laporan dinonaktifkan saat menggunakan data simulasi.')
    return
  }

  // Proyek wajib dipilih dari daftar (UUID asli); tidak menerima teks sembarang
  if (!form.projectId) {
    setMessage('error', 'Pilih proyek terkait dari daftar.')
    return
  }

  // Backend mewajibkan minimal 1 media (foto/video) pada setiap laporan
  if (!files.value.length) {
    setMessage('error', 'Unggah minimal 1 foto atau video bukti.')
    return
  }

  sending.value = true
  try {
    const result = await reportsApi.create(form, files.value)
    const trackingCode = result?.trackingCode || result?.code || result?.tiket
    setMessage(
      'success',
      trackingCode ? `Laporan terkirim. Kode pelacakan: ${trackingCode}` : 'Laporan terkirim.',
    )
    if (trackingCode) {
      router.push({ path: '/lacak-laporan', query: { code: trackingCode } })
      return
    }
    form.title = ''
    form.projectId = ''
    form.description = ''
    form.contact = ''
    projectQuery.value = ''
    files.value = []
    fileError.value = ''
  } catch (err) {
    if (err?.response?.status === 404) {
      setMessage('error', 'Proyek tidak ditemukan pada sistem backend.')
    } else if (err?.userMessage) {
      setMessage('error', err.userMessage)
    } else if (!err?.response) {
      setMessage('error', 'Gagal terhubung ke backend. Periksa koneksi jaringan Anda.')
    } else if (err?.response?.data?.message) {
      setMessage('error', err.response.data.message)
    } else {
      setMessage('error', err?.message || 'Gagal mengirim laporan. Periksa koneksi dan endpoint backend.')
    }
  } finally {
    sending.value = false
  }
}


async function applyQueryParams() {
  const q = route.query
  if (!q?.description) return

  if (q.title && typeof q.title === 'string') {
    form.title = q.title
  }
  if (q.category && categories.some((c) => c.value === q.category)) {
    form.category = q.category
  }
  if (q.description && typeof q.description === 'string') {
    form.description = q.description
  }
  if (q.projectId && typeof q.projectId === 'string') {
    form.projectId = q.projectId
    projectQuery.value = q.projectName && typeof q.projectName === 'string' ? q.projectName : ''
  }
}

onMounted(async () => {
  if (!projectsStore.projects.length) await projectsStore.fetchProjects()
  await applyQueryParams()
})
</script>

<style scoped>
.report-page {
  --accent: #f4532f;
  --accent-hover: #e0431f;
  --accent-soft: #fff1ee;
  --field-border: #e3e8ef;
  --placeholder: #9aa5b5;
  --text: #111111;
  --text-soft: #4b5563;
  --green: #34b36b;

  background: #f8f9fb;
  border-radius: 28px;
  padding: clamp(20px, 4vw, 40px);
  margin-top: 8px;
  font-family: var(--font);
  color: var(--text);
}

/* ---------- Judul ---------- */
.report-head h1 {
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.report-head p {
  margin-top: 8px;
  font-size: 15px;
  color: var(--text-soft);
}

.report-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: clamp(32px, 6vw, 80px);
  margin-top: 36px;
  align-items: start;
}

/* ---------- Form ---------- */
.report-form { display: grid; gap: 20px; }

.field {
  width: 100%;
  background: #fff;
  border: 1px solid var(--field-border);
  border-radius: 14px;
  padding: 16px 20px;
  font: inherit;
  font-size: 15px;
  color: var(--text);
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.03);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field::placeholder { color: var(--placeholder); }
.field:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(244, 83, 47, 0.15);
}
.field--area { resize: vertical; min-height: 130px; line-height: 1.6; }
.field--combo { padding-right: 52px; text-overflow: ellipsis; }

/* ---------- Combobox ---------- */
.combo { position: relative; }
.combo-chevron {
  position: absolute;
  right: 18px;
  top: 17px;
  color: var(--placeholder);
  pointer-events: none;
  transition: transform 0.15s;
}
.combo-chevron--open { transform: rotate(180deg); }
.combo-list {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  max-height: 280px;
  overflow-y: auto;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #fff;
  border: 1px solid var(--field-border);
  border-radius: 14px;
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.12);
}
.combo-item {
  display: grid;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
}
.combo-item--active { background: var(--accent-soft); }
.combo-name { font-size: 14px; font-weight: 600; }
.combo-sub { font-size: 12px; color: var(--text-soft); }
.combo-empty { padding: 12px 14px; font-size: 13px; color: var(--text-soft); }

/* ---------- Kategori ---------- */
.chip-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.chip-label { font-size: 14px; font-weight: 700; margin-right: 2px; }
.chip {
  background: #fff;
  border: 1px solid #d9dee6;
  border-radius: 999px;
  padding: 8px 20px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.15s;
}
.chip:hover { border-color: var(--accent); }
.chip--active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 700;
}
.chip:focus-visible { outline: 3px solid rgba(244, 83, 47, 0.3); outline-offset: 2px; }

/* ---------- Unggah ---------- */
.dropzone {
  display: grid;
  place-items: center;
  gap: 4px;
  text-align: center;
  padding: 38px 20px;
  background: #fafafb;
  border: 2px dashed #d3d9e2;
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover,
.dropzone--drag,
.dropzone:focus-within { border-color: var(--accent); background: var(--accent-soft); }
.dropzone-title { font-size: 15px; font-weight: 600; color: #6b7686; }
.dropzone-sub { font-size: 12px; color: var(--placeholder); }

.file-list { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid var(--field-border);
  border-radius: 12px;
  padding: 8px 12px 8px 16px;
  font-size: 13px;
}
.file-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.file-size { color: var(--text-soft); font-size: 12px; }
.file-remove {
  border: 0;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: var(--text-soft);
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 8px;
}
.file-remove:hover { background: var(--accent-soft); color: var(--accent); }
.file-error { margin: 8px 0 0; font-size: 12px; color: #c0392b; }

/* ---------- Toggle anonim ---------- */
.toggle-row { display: flex; align-items: flex-start; gap: 14px; cursor: pointer; }
.switch-input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch {
  position: relative;
  flex: 0 0 44px;
  height: 26px;
  margin-top: 1px;
  border-radius: 999px;
  background: #cbd2dc;
  transition: background 0.2s;
}
.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s;
}
.switch-input:checked + .switch { background: var(--green); }
.switch-input:checked + .switch::after { transform: translateX(18px); }
.switch-input:focus-visible + .switch { outline: 3px solid rgba(52, 179, 107, 0.35); outline-offset: 2px; }
.toggle-text { display: grid; gap: 2px; }
.toggle-text strong { font-size: 15px; font-weight: 700; }
.toggle-text small { font-size: 13px; color: var(--text-soft); }

/* ---------- Tombol kirim ---------- */
.submit-row { margin-top: 12px; }
.btn-submit {
  background: var(--accent);
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 16px 56px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.btn-submit:hover:not(:disabled) { background: var(--accent-hover); }
.btn-submit:active:not(:disabled) { transform: scale(0.98); }
.btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }
.btn-submit:focus-visible { outline: 3px solid rgba(244, 83, 47, 0.35); outline-offset: 3px; }

.notice { margin: 0; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; }
.notice--success { background: #e3f3ea; color: #1f7a4d; }
.notice--error { background: #fbe6e1; color: #b3321b; }

/* ---------- Panel samping ---------- */
.report-side { display: grid; gap: 20px; }
.side-card { background: #fff; border-radius: 20px; padding: 28px 30px; }
.side-card--amber { background: #fffbe6; }
.side-card h2 { font-size: 16px; font-weight: 700; margin-bottom: 18px; }
.side-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.side-list li { display: flex; align-items: center; gap: 14px; font-size: 14px; color: #374151; }
.dot { flex: 0 0 auto; display: inline-block; }
.dot--green { width: 18px; height: 18px; border-radius: 50%; background: #3dbb74; }
.dot--square { width: 8px; height: 8px; margin: 0 5px; border-radius: 2px; background: #d99a1d; }

.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 20px; }
.steps li { display: flex; gap: 16px; align-items: flex-start; }
.step-no {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #fde4e1;
  color: #e2483d;
  font-size: 12px;
  font-weight: 700;
}
.steps strong { display: block; font-size: 14px; font-weight: 700; }
.steps small { display: block; margin-top: 2px; font-size: 12.5px; color: #6b7280; }

/* ---------- Responsif ---------- */
@media (max-width: 991.98px) {
  .report-grid { grid-template-columns: minmax(0, 1fr); gap: 32px; }
}
@media (max-width: 575.98px) {
  .report-page { border-radius: 20px; }
  .btn-submit { width: 100%; padding-inline: 24px; }
  .side-card { padding: 22px 20px; }
}
@media (pointer: coarse) {
  .field { font-size: 16px; } /* mencegah iOS auto-zoom saat fokus */
}
@media (prefers-reduced-motion: reduce) {
  .switch, .switch::after, .chip, .field, .btn-submit, .combo-chevron { transition: none; }
}
</style>