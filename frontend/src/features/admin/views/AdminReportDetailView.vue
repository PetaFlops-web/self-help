<template>
  <div class="report-detail">
    <!-- Skeleton Loading State (Realistis 1:1) -->
    <template v-if="loading">
      <header class="rd-head rd-head--skeleton">
        <!-- Baris atas: breadcrumb + tombol aksi -->
        <div class="rd-head-top">
          <SkeletonBlock height="18px" width="120px" radius="4px" />
          <div class="rd-actions">
            <SkeletonBlock height="36px" width="110px" radius="6px" />
            <SkeletonBlock height="36px" width="145px" radius="6px" />
          </div>
        </div>

        <!-- Baris judul: tiket + status pill -->
        <div class="rd-head-main">
          <SkeletonBlock height="32px" width="180px" radius="6px" />
          <SkeletonBlock height="24px" width="95px" radius="999px" />
        </div>

        <!-- Baris chips meta -->
        <div class="rd-meta-chips">
          <SkeletonBlock height="24px" width="105px" radius="999px" />
          <SkeletonBlock height="24px" width="65px" radius="999px" />
          <SkeletonBlock height="24px" width="170px" radius="999px" />
        </div>

        <!-- Stepper horizontal skeleton -->
        <div class="rd-stepper">
          <template v-for="n in 4" :key="`skel-step-${n}`">
            <div class="step-item">
              <SkeletonBlock height="20px" width="20px" circle />
              <SkeletonBlock height="12px" width="65px" radius="4px" />
            </div>
            <div v-if="n < 4" class="step-line"></div>
          </template>
        </div>
      </header>

      <!-- Grid Kartu Skeleton -->
      <div class="rd-grid">
        <div class="rd-col rd-col--main">
          <!-- Bukti Fisik Card Skeleton -->
          <section class="rd-card">
            <div class="rd-card-header">
              <SkeletonBlock height="32px" width="32px" radius="8px" />
              <SkeletonBlock height="20px" width="90px" radius="4px" />
            </div>

            <div class="rd-media-skel-row">
              <SkeletonBlock height="128px" width="148px" radius="12px" />
              <SkeletonBlock height="128px" width="148px" radius="12px" />
              <SkeletonBlock height="128px" width="148px" radius="12px" />
            </div>

            <div class="rd-coords-bar">
              <div class="coords-left">
                <SkeletonBlock height="26px" width="26px" circle />
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <SkeletonBlock height="12px" width="55px" radius="4px" />
                  <SkeletonBlock height="12px" width="55px" radius="4px" />
                </div>
              </div>
              <SkeletonBlock height="14px" width="85px" radius="4px" />
            </div>
          </section>

          <!-- Narasi Laporan Card Skeleton -->
          <section class="rd-card">
            <div class="rd-card-header">
              <SkeletonBlock height="32px" width="32px" radius="8px" />
              <SkeletonBlock height="20px" width="115px" radius="4px" />
            </div>
            <div class="rd-narasi-skel">
              <SkeletonBlock height="14px" width="100%" radius="4px" />
              <SkeletonBlock height="14px" width="92%" radius="4px" style="margin-top: 8px;" />
              <SkeletonBlock height="14px" width="65%" radius="4px" style="margin-top: 8px;" />
            </div>
          </section>
        </div>

        <div class="rd-col rd-col--side">
          <!-- Konteks Proyek Terkait Card Skeleton -->
          <section class="rd-card">
            <div class="rd-card-header">
              <SkeletonBlock height="32px" width="32px" radius="8px" />
              <SkeletonBlock height="20px" width="145px" radius="4px" />
            </div>
            <div>
              <SkeletonBlock height="16px" width="100%" radius="4px" />
              <SkeletonBlock height="16px" width="75%" radius="4px" style="margin-top: 6px;" />
              <SkeletonBlock height="24px" width="130px" radius="999px" style="margin-top: 14px;" />
            </div>
          </section>

          <!-- Riwayat Card Skeleton -->
          <section class="rd-card">
            <div class="rd-card-header">
              <SkeletonBlock height="32px" width="32px" radius="8px" />
              <SkeletonBlock height="20px" width="75px" radius="4px" />
            </div>
            <div class="rd-tl-skel">
              <div class="rd-tl-skel-item">
                <SkeletonBlock height="8px" width="8px" circle style="margin-top: 4px;" />
                <div style="flex: 1;">
                  <SkeletonBlock height="14px" width="60px" radius="4px" />
                  <SkeletonBlock height="11px" width="110px" radius="4px" style="margin-top: 4px;" />
                </div>
              </div>
              <div class="rd-tl-skel-item" style="margin-top: 14px;">
                <SkeletonBlock height="8px" width="8px" circle style="margin-top: 4px;" />
                <div style="flex: 1;">
                  <SkeletonBlock height="14px" width="70px" radius="4px" />
                  <SkeletonBlock height="11px" width="110px" radius="4px" style="margin-top: 4px;" />
                </div>
              </div>
            </div>
            <div style="margin-top: 20px;">
              <SkeletonBlock height="64px" width="100%" radius="8px" />
            </div>
          </section>
        </div>
      </div>
    </template>

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

    <!-- Detail Laporan Sesuai Desain Mockup -->
    <template v-else-if="report">
      <header class="rd-head">
        <!-- Baris atas: breadcrumb + tombol aksi -->
        <div class="rd-head-top">
          <RouterLink to="/admin/laporan" class="rd-breadcrumb">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Antrean Laporan</span>
          </RouterLink>

          <div v-if="transitions.length" class="rd-actions">
            <!-- Tombol transisi langsung (misal Tandai Selesai) -->
            <button
              v-for="t in directTransitions"
              :key="t"
              type="button"
              class="action-btn action-btn--secondary"
              :disabled="actionBusy === t"
              @click="runDirectTransition(t)"
            >
              {{ actionBusy === t ? 'Memproses…' : transitionLabel(t) }}
            </button>

            <!-- Tombol utama Teruskan ke Lembaga -->
            <button
              v-if="canForwardNow"
              type="button"
              class="action-btn action-btn--primary"
              @click="openForward"
            >
              Teruskan ke Lembaga
            </button>

            <!-- Tombol Tolak -->
            <button
              v-if="canReject"
              type="button"
              class="action-btn action-btn--danger"
              @click="openReject"
            >
              Tolak
            </button>
          </div>
        </div>

        <!-- Baris judul: tiket + status pill + chip anonim -->
        <div class="rd-head-main">
          <h1 class="rd-title">{{ report.tiket }}</h1>
          <span class="rd-status-badge" :style="statusBadgeStyle">
            <span class="status-dot"></span>
            <span>{{ report.status }}</span>
          </span>
          <span v-if="report.anonim" class="rd-anon-chip">Anonim</span>
        </div>

        <!-- Baris chips meta (kategori, umur, tanggal dibuat) -->
        <div class="rd-meta-chips">
          <span class="meta-chip">{{ kategoriLabel }}</span>
          <span class="meta-chip">{{ relativeTimeLabel }}</span>
          <span class="meta-chip">Dibuat {{ formatDateTime(report.dibuat_pada) }}</span>
        </div>

        <!-- Stepper horizontal siklus laporan -->
        <div class="rd-stepper">
          <template v-for="(s, idx) in stepperItems" :key="s.key">
            <div class="step-item">
              <span class="step-circle" :class="`step-circle--${s.state}`">
                <svg
                  v-if="s.state === 'completed'"
                  viewBox="0 0 24 24"
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
              <span class="step-label" :class="{ 'step-label--upcoming': s.state === 'upcoming' }">
                {{ s.label }}
              </span>
            </div>
            <div
              v-if="idx < stepperItems.length - 1"
              class="step-line"
              :class="{ 'step-line--active': s.isLineActive }"
            ></div>
          </template>
        </div>

        <p v-if="actionError" class="rd-action-error" role="alert">{{ actionError }}</p>
      </header>

      <!-- Grid kartu: kolom utama (Bukti Fisik + Narasi) + kolom sisi (Konteks Proyek + Riwayat) -->
      <div class="rd-grid">
        <div class="rd-col rd-col--main">
          <!-- Bukti Fisik: media + koordinat -->
          <section v-if="mediaItems.length || hasCoords" class="rd-card">
            <div class="rd-card-header">
              <span class="card-icon-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </span>
              <h2 class="rd-card-title">Bukti Fisik</h2>
            </div>

            <MediaGallery v-if="mediaItems.length" :items="mediaItems" size="lg" />

            <div v-if="hasCoords" class="rd-coords-bar">
              <div class="coords-left">
                <span class="coords-icon-wrap" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <div class="coords-numbers">
                  <span>{{ report.lat }},</span>
                  <span>{{ report.lng }}</span>
                </div>
              </div>
              <a v-if="mapUrl" :href="mapUrl" target="_blank" rel="noopener" class="rd-map-link">
                <span>Lihat di peta</span>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </a>
            </div>
          </section>

          <!-- Narasi Laporan -->
          <section class="rd-card">
            <div class="rd-card-header">
              <span class="card-icon-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="17" y1="10" x2="3" y2="10"></line>
                  <line x1="21" y1="6" x2="3" y2="6"></line>
                  <line x1="21" y1="14" x2="3" y2="14"></line>
                  <line x1="17" y1="18" x2="3" y2="18"></line>
                </svg>
              </span>
              <h2 class="rd-card-title">Narasi Laporan</h2>
            </div>
            <p class="rd-narasi">{{ report.keterangan || 'Tidak ada narasi.' }}</p>
          </section>
        </div>

        <div class="rd-col rd-col--side">
          <!-- Konteks Proyek Terkait -->
          <section v-if="report.proyek || showForwardInfo" class="rd-card">
            <div class="rd-card-header">
              <span class="card-icon-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21h18"></path>
                  <path d="M5 21V7l8-4v18"></path>
                  <path d="M19 21V11l-6-3"></path>
                  <path d="M9 9h1"></path>
                  <path d="M9 13h1"></path>
                  <path d="M9 17h1"></path>
                </svg>
              </span>
              <h2 class="rd-card-title">Konteks Proyek Terkait</h2>
            </div>

            <template v-if="report.proyek">
              <p class="rd-proj-name">{{ report.proyek.nama || 'Tanpa nama' }}</p>
              <div v-if="report.proyek.kabupaten" class="rd-proj-loc-wrap">
                <span class="rd-proj-chip">{{ report.proyek.kabupaten }}</span>
              </div>
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
            <div class="rd-card-header">
              <span class="card-icon-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </span>
              <h2 class="rd-card-title">Riwayat</h2>
            </div>

            <ul v-if="report.dibuat_pada || report.diteruskan_pada" class="rd-timeline">
              <li v-if="report.dibuat_pada" class="rd-tl-item">
                <span class="rd-tl-dot" aria-hidden="true"></span>
                <div class="rd-tl-content">
                  <span class="rd-tl-title">Dibuat</span>
                  <span class="rd-tl-time">{{ formatDateTime(report.dibuat_pada) }}</span>
                </div>
              </li>
              <li v-if="report.diteruskan_pada" class="rd-tl-item">
                <span class="rd-tl-dot" aria-hidden="true"></span>
                <div class="rd-tl-content">
                  <span class="rd-tl-title">Diteruskan</span>
                  <span class="rd-tl-time">{{ formatDateTime(report.diteruskan_pada) }}</span>
                </div>
              </li>
            </ul>

            <div v-if="report.catatan_verifikator" class="rd-note rd-note--peach">
              <span class="rd-note-label">CATATAN VERIFIKATOR</span>
              <p class="rd-note-text">{{ report.catatan_verifikator }}</p>
            </div>

            <div
              v-if="report.status === 'Ditolak' && report.alasan_tolak"
              class="rd-note rd-note--danger"
            >
              <span class="rd-note-label">ALASAN PENOLAKAN</span>
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
      @success="onActionSuccess('rejected')"
    />
    <ForwardModal
      :show="forwardOpen"
      :tiket="tiket"
      :proyek-id="proyekId"
      @close="forwardOpen = false"
      @success="onActionSuccess('forwarded')"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { adminReportsApi } from '@/services/api'
import MediaGallery from '@/components/ui/MediaGallery.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { useToast } from '@/composables/useToast'
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
const toast = useToast()

const tiket = computed(() => String(route.params.tiket || ''))

const loading = ref(true)
const error = ref('')
const notFound = ref(false)
const report = ref(null)
const actionBusy = ref('')
const actionError = ref('')

const rejectOpen = ref(false)
const forwardOpen = ref(false)

const TRANSITION_LABELS = {
  Diverifikasi: 'Verifikasi Laporan',
  Selesai: 'Tandai Selesai',
  Ditindaklanjuti: 'Tandai Ditindaklanjuti',
}

const transitions = computed(() => STATUS_TRANSITIONS[report.value?.status] || [])
const canForwardNow = computed(() => canForward(report.value?.status))
const canReject = computed(() => transitions.value.includes('Ditolak'))
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
  () => KATEGORI_LABELS[report.value?.kategori] || report.value?.kategori || 'Infrastruktur',
)
const umur = computed(() => reportAge(report.value?.dibuat_pada))
const relativeTimeLabel = computed(() => {
  const u = umur.value
  if (!u || u === '—') return 'Baru saja'
  return `${u} lalu`
})

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

const stepperItems = computed(() => {
  const cur = report.value?.status
  if (cur === 'Ditolak') {
    return [
      { key: 'Dilaporkan', label: 'Dibuat', state: 'completed', isLineActive: true },
      { key: 'Ditolak', label: 'Ditolak', state: 'rejected', isLineActive: false },
    ]
  }

  const steps = [
    { key: 'Dilaporkan', label: 'Dibuat' },
    { key: 'Diverifikasi', label: 'Diverifikasi' },
    { key: 'Diteruskan', label: 'Diteruskan' },
    { key: 'Selesai', label: 'Selesai' },
  ]

  const statusLevel = {
    Dilaporkan: 0,
    Diverifikasi: 1,
    Diteruskan: 2,
    Ditindaklanjuti: 2,
    Selesai: 3,
  }

  const level = statusLevel[cur] ?? 0

  return steps.map((s, idx) => {
    let state = 'upcoming'
    if (idx < level) {
      state = 'completed'
    } else if (idx === level) {
      state = cur === 'Selesai' ? 'completed' : 'completed'
    } else if (idx === level + 1) {
      state = 'active'
    }

    const isLineActive = idx < level

    return {
      ...s,
      state,
      isLineActive,
    }
  })
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
    await loadDetail()
    const msg = target === 'Diverifikasi'
      ? `Laporan #${tiket.value} berhasil diverifikasi.`
      : target === 'Selesai'
        ? `Laporan #${tiket.value} berhasil ditandai Selesai.`
        : `Status laporan #${tiket.value} berhasil diubah ke ${target}.`
    toast.success(msg, 'Status Diperbarui')
  } catch (err) {
    const errMsg = err?.userMessage || err?.message || 'Gagal memperbarui status laporan.'
    actionError.value = errMsg
    toast.error(errMsg, 'Gagal Memperbarui Status')
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

function onActionSuccess(type) {
  rejectOpen.value = false
  forwardOpen.value = false
  if (type === 'rejected') {
    toast.success(`Laporan #${tiket.value} telah ditolak dengan alasan tercatat.`, 'Laporan Ditolak')
  } else if (type === 'forwarded') {
    toast.success(`Laporan #${tiket.value} berhasil diteruskan ke instansi berwenang.`, 'Laporan Diteruskan')
  }
  loadDetail()
}

onMounted(loadDetail)
watch(() => route.params.tiket, loadDetail)
</script>

<style scoped>
.report-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Status memuat / galat */
.state {
  padding: 48px 16px;
  text-align: center;
}
.state-loading {
  color: var(--c-muted);
  font-size: 13px;
}
.state-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--c-ink);
}
.state-error .state-title {
  color: var(--c-danger);
}
.state-text {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--c-muted);
}
.state-link {
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
}
.state-link:hover {
  text-decoration: underline;
}

/* ── Header Laporan (Frame Sesuai Mockup) ── */
.rd-head {
  background: var(--c-surface, #ffffff);
  border: 1px solid var(--c-border, #e7e3dc);
  border-top: 4px solid #ff5c00;
  border-radius: 20px;
  padding: 24px 28px 22px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}
.rd-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 14px;
}
.rd-breadcrumb {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  text-decoration: none;
  transition: color 0.15s ease;
}
.rd-breadcrumb:hover {
  color: #ff5c00;
}

.rd-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.rd-head-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}
.rd-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: var(--c-ink, #111827);
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.rd-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.rd-anon-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: #f3f2ee;
  color: #6b7280;
}

/* Metadata Chips */
.rd-meta-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 22px;
}
.meta-chip {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 999px;
  background: #f4f3ef;
  color: #4b5563;
  font-size: 12px;
  font-weight: 500;
}

/* Stepper Horizontal */
.rd-stepper {
  display: flex;
  align-items: center;
  width: 100%;
  padding-top: 16px;
  border-top: 1px solid #f0eee8;
}
.step-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.step-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s ease;
}
.step-circle--completed {
  background: #10b981;
  color: #ffffff;
}
.step-circle--active {
  background: #ffffff;
  border: 2px solid #ff5c00;
}
.step-circle--upcoming {
  background: #ffffff;
  border: 2px solid #d1d5db;
}
.step-circle--rejected {
  background: #ef4444;
  color: #ffffff;
}
.step-label {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}
.step-label--upcoming {
  color: #9ca3af;
  font-weight: 500;
}
.step-line {
  flex: 1 1 auto;
  height: 2px;
  background: #e5e7eb;
  margin: 0 14px;
  transition: background 0.2s ease;
}
.step-line--active {
  background: #10b981;
}

.rd-action-error {
  margin: 14px 0 0;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--c-danger-soft, #fce4df);
  color: var(--c-danger, #d9381e);
  font-size: 12px;
  font-weight: 500;
}

/* ── Grid Kartu Konten (Kolom Utama + Kolom Sisi) ── */
.rd-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.68fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.rd-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.rd-card {
  background: var(--c-surface, #ffffff);
  border: 1px solid var(--c-border, #e7e3dc);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.rd-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.card-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #fff4eb;
  color: #ff5c00;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rd-card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--c-ink, #111827);
}

/* Bukti Fisik */
.rd-coords-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #f7f6f2;
  border-radius: 12px;
  margin-top: 18px;
}
.coords-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.coords-icon-wrap {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #ffeedd;
  color: #e05300;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.coords-numbers {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}
.rd-map-link {
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  transition: opacity 0.15s;
}
.rd-map-link:hover {
  text-decoration: underline;
}

/* Narasi Laporan */
.rd-narasi {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--c-ink, #1f2937);
  white-space: pre-wrap;
}

/* Konteks Proyek */
.rd-proj-name {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--c-ink, #111827);
  line-height: 1.45;
}
.rd-proj-loc-wrap {
  display: flex;
}
.rd-proj-chip {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: #f3f2ee;
  color: #4b5563;
  font-size: 12px;
  font-weight: 500;
}
.rd-kv {
  margin: 16px 0 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 14px;
  font-size: 12px;
}
.rd-kv dt {
  color: #6b7280;
}
.rd-kv dd {
  margin: 0;
  color: #111827;
  font-weight: 600;
}

/* Riwayat */
.rd-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rd-tl-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.rd-tl-dot {
  flex: none;
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: #ff5c00;
}
.rd-tl-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rd-tl-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}
.rd-tl-time {
  font-size: 12px;
  color: #6b7280;
}

/* Catatan Verifikator */
.rd-note {
  margin-top: 18px;
  padding: 12px 16px;
  border-radius: 10px;
}
.rd-note--peach {
  background: #fdf6f0;
  border: 1px solid #ffeedd;
}
.rd-note--peach .rd-note-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: #c25e1a;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.rd-note--danger {
  background: var(--c-danger-soft, #fce4df);
  border: 1px solid #f8c9c0;
}
.rd-note--danger .rd-note-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: var(--c-danger, #d9381e);
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.rd-note-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #1f2937;
  white-space: pre-wrap;
}

/* ── Tombol Aksi ── */
.action-btn {
  height: 38px;
  padding: 0 18px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.action-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.action-btn--primary {
  background: #ff5c00;
  border: 1px solid #ff5c00;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(255, 92, 0, 0.25);
}
.action-btn--primary:hover:not(:disabled) {
  background: #e65300;
  border-color: #e65300;
}

.action-btn--secondary {
  background: #ffffff;
  border: 1px solid #dcdcd8;
  color: #1f2937;
}
.action-btn--secondary:hover:not(:disabled) {
  background: #f8f8f6;
  border-color: #cacac5;
}

.action-btn--danger {
  background: #ffffff;
  border: 1px solid #fca5a5;
  color: #dc2626;
}
.action-btn--danger:hover:not(:disabled) {
  background: #fef2f2;
}

/* ── Skeleton Helper ── */
.rd-media-skel-row {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.rd-tl-skel-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* ── Responsif ── */
@media (max-width: 899.98px) {
  .rd-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 575.98px) {
  .rd-head {
    padding: 18px;
  }
  .rd-head-top {
    flex-direction: column;
    align-items: flex-start;
  }
  .rd-actions {
    width: 100%;
  }
  .action-btn {
    flex: 1;
  }
  .rd-stepper {
    overflow-x: auto;
    padding-bottom: 6px;
  }
}
</style>
