<template>
  <div class="report-detail">
    <!-- Memuat -->
    <div v-if="loading" class="state state-loading" aria-busy="true">
      Memuat detail laporan…
    </div>

    <!-- Galat / tidak ditemukan -->
    <div v-else-if="error" class="state state-error">
      <template v-if="notFound">
        <h2 class="state-title">Laporan tidak ditemukan</h2>
        <p class="state-text">Tiket “{{ tiket }}” tidak dikenali atau telah dihapus.</p>
      </template>
      <template v-else>
        <h2 class="state-title">Gagal memuat laporan</h2>
        <p class="state-text">{{ error }}</p>
      </template>
      <RouterLink to="/admin/laporan" class="state-link">← Kembali ke Antrean Laporan</RouterLink>
    </div>

    <!-- Detail — tata letak kartu sesuai frame 03 -->
    <template v-else-if="report">
      <header class="rd-head">
        <!-- Baris atas: breadcrumb + tombol aksi -->
        <div class="rd-head-top">
          <RouterLink to="/admin/laporan" class="rd-breadcrumb">← Antrean Laporan</RouterLink>
          <div v-if="transitions.length" class="rd-actions">
            <button
              v-if="canForwardNow"
              type="button"
              class="action-btn action-btn--primary"
              @click="openForward"
            >
              Teruskan ke Lembaga
            </button>
            <button
              v-if="canReject"
              type="button"
              class="action-btn action-btn--danger"
              @click="openReject"
            >
              Tolak
            </button>
            <button
              v-for="t in directTransitions"
              :key="t"
              type="button"
              class="action-btn action-btn--ghost"
              :disabled="actionBusy === t"
              @click="runDirectTransition(t)"
            >
              {{ actionBusy === t ? 'Memproses…' : transitionLabel(t) }}
            </button>
          </div>
        </div>

        <!-- Baris judul: tiket + status pill + chip anonim -->
        <div class="rd-head-main">
          <h1 class="rd-title">{{ report.tiket }}</h1>
          <span class="rd-status" :style="statusBadgeStyle">● {{ report.status }}</span>
          <span v-if="report.anonim" class="rd-anon">Anonim</span>
        </div>

        <!-- Baris meta -->
        <div class="rd-meta">
          <span>{{ kategoriLabel }}</span>
          <span class="dot" aria-hidden="true">·</span>
          <span>{{ umur }}</span>
          <span class="dot" aria-hidden="true">·</span>
          <span>Dibuat {{ formatDateTime(report.dibuat_pada) }}</span>
        </div>

        <p v-if="actionError" class="rd-action-error" role="alert">{{ actionError }}</p>
      </header>

      <!-- Grid kartu: kolom utama (Bukti Fisik + Narasi) + kolom sisi (Konteks Proyek + Riwayat) -->
      <div class="rd-grid">
        <div class="rd-col rd-col--main">
          <!-- Bukti Fisik: media + koordinat -->
          <section v-if="mediaItems.length || hasCoords" class="rd-card">
            <h2 class="rd-card-title">Bukti Fisik</h2>
            <MediaGallery v-if="mediaItems.length" :items="mediaItems" />
            <div v-if="hasCoords" class="rd-coords">
              <p class="rd-coords-val">{{ report.lat }}, {{ report.lng }}</p>
              <a v-if="mapUrl" :href="mapUrl" target="_blank" rel="noopener" class="rd-map-link">
                Lihat di peta
              </a>
            </div>
          </section>

          <!-- Narasi Laporan -->
          <section class="rd-card">
            <h2 class="rd-card-title">Narasi Laporan</h2>
            <p class="rd-narasi">{{ report.keterangan || 'Tidak ada narasi.' }}</p>
          </section>
        </div>

        <div class="rd-col rd-col--side">
          <!-- Konteks Proyek Terkait -->
          <section v-if="report.proyek || showForwardInfo" class="rd-card">
            <h2 class="rd-card-title">Konteks Proyek Terkait</h2>
            <template v-if="report.proyek">
              <p class="rd-proj-name">{{ report.proyek.nama || 'Tanpa nama' }}</p>
              <p v-if="report.proyek.kabupaten" class="rd-proj-loc">{{ report.proyek.kabupaten }}</p>
            </template>
            <dl v-if="showForwardInfo" class="rd-kv">
              <dt>Lembaga tujuan</dt>
              <dd>{{ lembagaLabel }}</dd>
              <template v-if="report.diteruskan_pada">
                <dt>Diteruskan pada</dt>
                <dd>{{ formatDateTime(report.diteruskan_pada) }}</dd>
              </template>
            </dl>
          </section>

          <!-- Riwayat -->
          <section class="rd-card">
            <h2 class="rd-card-title">Riwayat</h2>
            <ul v-if="report.dibuat_pada || report.diteruskan_pada" class="rd-timeline">
              <li v-if="report.dibuat_pada" class="rd-tl-item">
                <span class="rd-tl-dot" aria-hidden="true"></span>
                <span class="rd-tl-text">Dibuat {{ formatDateTime(report.dibuat_pada) }}</span>
              </li>
              <li v-if="report.diteruskan_pada" class="rd-tl-item">
                <span class="rd-tl-dot" aria-hidden="true"></span>
                <span class="rd-tl-text">Diteruskan {{ formatDateTime(report.diteruskan_pada) }}</span>
              </li>
            </ul>
            <div v-if="report.catatan_verifikator" class="rd-note">
              <span class="rd-note-label">Catatan verifikator</span>
              <p class="rd-note-text">{{ report.catatan_verifikator }}</p>
            </div>
            <div
              v-if="report.status === 'Ditolak' && report.alasan_tolak"
              class="rd-note rd-note--danger"
            >
              <span class="rd-note-label">Alasan penolakan</span>
              <p class="rd-note-text">{{ report.alasan_tolak }}</p>
            </div>
          </section>
        </div>
      </div>
    </template>

    <!-- Modal aksi -->
    <RejectModal
      :show="rejectOpen"
      :tiket="tiket"
      @close="rejectOpen = false"
      @success="onActionSuccess"
    />
    <ForwardModal
      :show="forwardOpen"
      :tiket="tiket"
      :proyek-id="proyekId"
      @close="forwardOpen = false"
      @success="onActionSuccess"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { adminReportsApi } from '@/services/api'
import MediaGallery from '@/components/ui/MediaGallery.vue'
import { toMediaItems } from '@/utils/media'
import {
  STATUS_TRANSITIONS,
  STATUS_BADGE,
  KATEGORI_LABELS,
  LEMBAGA_LABELS,
  canForward,
  reportAge,
} from '@/features/admin/config/reports'
import RejectModal from '../components/RejectModal.vue'
import ForwardModal from '../components/ForwardModal.vue'

const route = useRoute()

const tiket = computed(() => String(route.params.tiket || ''))

const loading = ref(true)
const error = ref('')
const notFound = ref(false)
const report = ref(null)
const actionBusy = ref('')
const actionError = ref('')

const rejectOpen = ref(false)
const forwardOpen = ref(false)

// Label transisi langsung (verifikasi / selesai / ditindaklanjuti).
const TRANSITION_LABELS = {
  Diverifikasi: 'Verifikasi Laporan',
  Selesai: 'Tandai Selesai',
  Ditindaklanjuti: 'Tandai Ditindaklanjuti',
}

// ── Turunan tampilan ──
const transitions = computed(() => STATUS_TRANSITIONS[report.value?.status] || [])
const canForwardNow = computed(() => canForward(report.value?.status))
// Tolak hanya bila 'Ditolak' adalah transisi yang sah dari status saat ini.
const canReject = computed(() => transitions.value.includes('Ditolak'))
// Transisi selain tolak & teruskan — dijalankan langsung via verify().
const directTransitions = computed(() =>
  transitions.value.filter((t) => t !== 'Ditolak' && t !== 'Diteruskan'),
)

const statusBadgeStyle = computed(() => {
  const s = report.value?.status
  const badge = STATUS_BADGE[s]
  if (!badge) return {}
  return { color: badge.text, backgroundColor: badge.bg }
})

const kategoriLabel = computed(
  () => KATEGORI_LABELS[report.value?.kategori] || report.value?.kategori || '—',
)
const umur = computed(() => reportAge(report.value?.dibuat_pada))
const mediaItems = computed(() => toMediaItems(report.value?.foto_urls))
const proyekId = computed(() => report.value?.proyek_id || null)

const showForwardInfo = computed(() => {
  const s = report.value?.status
  return s === 'Diteruskan' || s === 'Ditindaklanjuti'
})
const lembagaLabel = computed(
  () => LEMBAGA_LABELS[report.value?.lembaga_tujuan] || report.value?.lembaga_tujuan || '—',
)

const hasCoords = computed(() => {
  const r = report.value
  return r && r.lat != null && r.lng != null && r.lat !== '' && r.lng !== ''
})
const mapUrl = computed(() => {
  if (!hasCoords.value) return ''
  const { lat, lng } = report.value
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
})

function transitionLabel(t) {
  return TRANSITION_LABELS[t] || t
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

async function loadDetail() {
  if (!tiket.value) return
  loading.value = true
  error.value = ''
  notFound.value = false
  report.value = null
  actionError.value = ''
  try {
    report.value = await adminReportsApi.getDetail(tiket.value)
    if (!report.value) {
      notFound.value = true
      error.value = 'Laporan tidak ditemukan'
    }
  } catch (err) {
    if (err?.response?.status === 404) {
      notFound.value = true
      error.value = 'Laporan tidak ditemukan'
    } else {
      error.value = err?.userMessage || err?.message || 'Gagal memuat detail laporan.'
    }
  } finally {
    loading.value = false
  }
}

async function runDirectTransition(target) {
  actionBusy.value = target
  actionError.value = ''
  try {
    await adminReportsApi.verify(tiket.value, { status: target })
    // Setelah aksi berhasil, muat ulang detail agar status terbaru tampil.
    await loadDetail()
  } catch (err) {
    actionError.value = err?.userMessage || err?.message || 'Gagal memperbarui status laporan.'
  } finally {
    actionBusy.value = ''
  }
}

function openReject() {
  actionError.value = ''
  rejectOpen.value = true
}
function openForward() {
  actionError.value = ''
  forwardOpen.value = true
}

// verify (tolak) maupun forward berhasil → tutup modal + muat ulang detail.
function onActionSuccess() {
  rejectOpen.value = false
  forwardOpen.value = false
  loadDetail()
}

onMounted(loadDetail)
watch(() => route.params.tiket, loadDetail)
</script>

<style scoped>
.report-detail { display: flex; flex-direction: column; gap: var(--sp-4); /* 16 */ }

/* Status memuat / galat */
.state { padding: var(--sp-6) var(--sp-4); text-align: center; }
.state-loading { color: var(--c-muted); font-size: var(--fs-sm); }
.state-title { margin: 0 0 var(--sp-2); font-size: var(--fs-xl); font-weight: 800; color: var(--c-ink); }
.state-title,
.state-text { color: var(--c-muted); }
.state-error .state-title { color: var(--c-danger); }
.state-text { margin: 0 0 var(--sp-4); font-size: var(--fs-sm); }
.state-link {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-info);
  text-decoration: none;
}
.state-link:hover { text-decoration: underline; }

/* ── Header laporan (frame 03: breadcrumb + judul + status + aksi) ── */
.rd-head {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border); /* #E7E3DC */
  border-radius: var(--r-xl); /* 16 — kartu §9 */
  padding: var(--sp-4) var(--sp-5); /* 16 × 20 */
}
.rd-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}
.rd-breadcrumb {
  font-size: var(--fs-sm); /* 11 */
  font-weight: 600;
  color: var(--c-muted);
  text-decoration: none;
  transition: color 0.15s;
}
.rd-breadcrumb:hover { color: var(--c-ink); }

.rd-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2); /* 8 */
}

.rd-head-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-2);
}
.rd-title {
  margin: 0;
  font-size: var(--fs-xl); /* 18 */
  font-weight: 800;
  color: var(--c-ink);
  letter-spacing: 0.01em;
}
.rd-status {
  font-size: var(--fs-xs); /* 10 */
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--r-pill); /* pill */
}
.rd-anon {
  font-size: var(--fs-xs);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--r-pill);
  background: var(--c-bg); /* #F4F2EE */
  color: var(--c-muted);
}

.rd-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: var(--fs-sm); /* 11 */
  color: var(--c-muted);
}
.rd-meta .dot { color: var(--c-subtle); }

.rd-action-error {
  margin: var(--sp-3) 0 0;
  padding: 8px 12px;
  border-radius: var(--r-sm);
  background: var(--c-danger-soft);
  color: var(--c-danger);
  font-size: var(--fs-sm);
  font-weight: 500;
}

/* ── Grid kartu: kolom utama + kolom sisi (frame 03) ── */
.rd-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.97fr) minmax(0, 1fr); /* 760 : 386 */
  gap: var(--sp-4); /* 16 */
  align-items: start;
}
.rd-col {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4); /* 16 — jarak antar kartu */
  min-width: 0;
}

.rd-card {
  background: var(--c-surface); /* #FFFFFF */
  border: var(--bw) solid var(--c-border); /* #E7E3DC */
  border-radius: var(--r-xl); /* 16 — kartu §9, tanpa bayangan §10 */
  padding: var(--sp-5); /* 20 */
}
.rd-card-title {
  margin: 0 0 var(--sp-3); /* 12 */
  font-size: var(--fs-xl); /* 18 — judul kartu */
  font-weight: 700;
  color: var(--c-ink); /* #111111 */
}

/* Narasi */
.rd-narasi {
  margin: 0;
  font-size: var(--fs-sm); /* 11 */
  line-height: 1.6;
  color: var(--c-ink);
  white-space: pre-wrap;
}

/* Koordinat (dalam kartu Bukti Fisik) */
.rd-coords { margin-top: var(--sp-3); }
.rd-coords-val {
  margin: 0 0 var(--sp-1);
  font-size: var(--fs-sm);
  color: var(--c-ink);
  font-variant-numeric: tabular-nums;
}
.rd-map-link {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-info);
  text-decoration: none;
}
.rd-map-link:hover { text-decoration: underline; }

/* Konteks Proyek */
.rd-proj-name { margin: 0; font-size: var(--fs-sm); font-weight: 600; color: var(--c-ink); }
.rd-proj-loc { margin: 2px 0 0; font-size: var(--fs-xs); color: var(--c-muted); }
.rd-kv {
  margin: var(--sp-3) 0 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--sp-1) var(--sp-4);
  font-size: var(--fs-sm);
}
.rd-kv dt { color: var(--c-muted); }
.rd-kv dd { margin: 0; color: var(--c-ink); font-weight: 500; }

/* Riwayat — garis waktu sederhana */
.rd-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2); /* 8 */
}
.rd-tl-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding-left: 2px;
  padding-bottom: var(--sp-2);
}
.rd-tl-item:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 14px;
  bottom: 0;
  width: var(--bw);
  background: var(--c-border); /* garis penghubung */
}
.rd-tl-dot {
  flex: none;
  width: 9px;
  height: 9px;
  margin-top: 3px;
  border-radius: var(--r-pill);
  background: var(--c-primary); /* #FF6B2B */
  border: 2px solid var(--c-surface);
}
.rd-tl-text {
  font-size: var(--fs-sm); /* 11 */
  line-height: 1.5;
  color: var(--c-ink);
}

/* Catatan & alasan (dalam kartu Riwayat) */
.rd-note {
  margin-top: var(--sp-3);
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--c-bg-alt); /* #F8F7F4 */
}
.rd-note--danger {
  background: var(--c-danger-soft); /* #FCE4DF */
}
.rd-note-label {
  display: block;
  font-size: var(--fs-xs); /* 10 */
  font-weight: 600;
  color: var(--c-subtle);
  margin-bottom: 4px;
}
.rd-note--danger .rd-note-label { color: var(--c-danger); }
.rd-note-text {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: 1.6;
  color: var(--c-ink);
  white-space: pre-wrap;
}

/* ── Tombol aksi (dipindah ke header) ── */
.action-btn {
  height: 36px;
  padding: 0 16px;
  font-family: var(--font);
  font-size: var(--fs-sm); /* 11 */
  font-weight: 700;
  border-radius: var(--r-md); /* 8 — tombol frame 03 */
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.action-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.action-btn--primary {
  background: var(--c-primary); /* #FF6B2B */
  border: var(--bw) solid var(--c-primary);
  color: var(--c-ink); /* §7+§8: teks gelap pada primer */
}
.action-btn--primary:hover:not(:disabled) { background: #f57f1a; }
.action-btn--danger {
  background: var(--c-danger);
  border: var(--bw) solid var(--c-danger);
  color: var(--c-surface);
}
.action-btn--danger:hover:not(:disabled) { background: #c2341a; }
.action-btn--ghost {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border-strong); /* #DCD8D0 */
  color: var(--c-ink);
  font-weight: 600;
}
.action-btn--ghost:hover:not(:disabled) { background: var(--c-bg); }

/* ── Responsif: kolom tunggal pada layar sempit ── */
@media (max-width: 899.98px) {
  .rd-grid { grid-template-columns: 1fr; }
}
@media (max-width: 575.98px) {
  .rd-head-top { align-items: flex-start; }
  .rd-actions { width: 100%; }
}
</style>
