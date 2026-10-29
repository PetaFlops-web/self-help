<template>
  <section class="track-page">
    <header class="track-head">
      <h1>Lacak Laporan</h1>
      <p>Masukkan nomor tiket untuk melihat sampai mana laporan Anda ditangani.</p>
    </header>

    <!-- Pencarian -->
    <form class="search" role="search" @submit.prevent="track">
      <svg class="search-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <label class="visually-hidden" for="t-code">Nomor tiket</label>
      <input
        id="t-code"
        v-model.trim="code"
        class="search-input"
        type="text"
        required
        autocomplete="off"
        placeholder="Masukkan nomor tiket, mis. LPR-ABCD1234-EFGH"
      />
      <button class="search-btn" type="submit" :disabled="loading">{{ loading ? 'Mencari…' : 'Lacak' }}</button>
    </form>

    <!-- Status pencarian -->
    <div class="status-row" aria-live="polite">
      <p v-if="message" class="pill pill--error">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
        {{ message }}
      </p>
      <p v-else-if="view" class="pill pill--ok">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
        Tiket ditemukan<template v-if="view.updatedLabel"> · diperbarui {{ view.updatedLabel }}</template>
      </p>
    </div>

    <!-- Skeleton saat memuat -->
    <div v-if="showSkeleton" class="result-grid" aria-busy="true">
      <span class="visually-hidden" role="status">Mencari status laporan…</span>
      <div class="area-ticket"><SkeletonBlock width="100%" height="226px" radius="28px" /></div>
      <div class="area-aside"><SkeletonBlock width="100%" height="130px" radius="24px" /></div>
      <div class="area-timeline"><SkeletonBlock width="100%" height="300px" radius="28px" /></div>
    </div>

    <!-- Hasil -->
    <div v-else-if="view" class="result-grid">
      <!-- Kartu tiket -->
      <article class="ticket area-ticket">
        <div class="ticket-main">
          <span class="ticket-kicker">Nomor tiket</span>
          <strong class="ticket-code">{{ view.code }}</strong>
          <span class="ticket-status" :class="view.statusClass"><i class="ticket-dot" aria-hidden="true"></i>{{ view.statusLabel }}</span>
          <ul class="ticket-tags">
            <li v-for="t in view.tags" :key="t">{{ t }}</li>
          </ul>
        </div>
        <div v-if="view.project.name" class="ticket-project">
          <span class="ticket-project-kicker">Proyek</span>
          <strong>{{ view.project.name }}</strong>
          <span v-if="view.project.meta" class="ticket-project-meta">{{ view.project.meta }}</span>
        </div>
      </article>

      <!-- Panel kanan -->
      <aside class="aside area-aside">
        <div v-if="view.sla" class="sla-card">
          <div class="sla-head">
            <strong>Waktu sejak diverifikasi</strong>
            <span class="sla-count">{{ view.sla.days }} dari {{ view.sla.limit }} hari</span>
          </div>
          <div class="sla-bar" role="progressbar" :aria-valuenow="view.sla.days" aria-valuemin="0" :aria-valuemax="view.sla.limit">
            <div class="sla-fill" :style="{ width: view.sla.percent + '%' }"></div>
          </div>
          <p class="sla-note">Indikator Keterbukaan (D6–02): sedang bila ≥ 30 hari, tinggi bila ≥ 60 hari tanpa tindak lanjut.</p>
        </div>

        <button type="button" class="btn-forward" @click="forward">Teruskan ke pihak berwenang</button>
        <div class="btn-pair">
          <button type="button" class="btn-outline" @click="copyCode">{{ copied ? 'Nomor tersalin ✓' : 'Salin nomor' }}</button>
          <RouterLink v-if="view.project.id" class="btn-outline" :to="`/proyek/${encodeURIComponent(view.project.id)}`">Lihat proyek</RouterLink>
          <span v-else class="btn-outline btn-outline--off" aria-disabled="true">Lihat proyek</span>
        </div>
        <p v-if="actionNote" class="action-note" role="status">{{ actionNote }}</p>
        <p class="aside-disclaimer">Ini indikator risiko, bukan bukti pelanggaran.</p>
      </aside>

      <!-- Linimasa -->
      <section class="card-white area-timeline" aria-labelledby="tl-title">
        <div class="card-head">
          <div>
            <h2 id="tl-title">Linimasa status</h2>
            <p>Perkembangan laporan dari diterima sampai selesai</p>
          </div>
          <span class="step-pill">Langkah {{ view.current }} / 5</span>
        </div>

        <ol class="steps">
          <li v-for="s in view.steps" :key="s.n" class="step" :class="`step--${s.state}`">
            <span class="step-node" :aria-label="`Langkah ${s.n}: ${s.label}`">
              <svg v-if="s.state === 'done'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              <template v-else>{{ s.n }}</template>
            </span>
            <div class="step-body">
              <strong class="step-title">{{ s.label }}</strong>
              <span v-if="s.state === 'current'" class="step-now">Saat ini</span>
              <span v-if="s.date" class="step-date">{{ s.date }}</span>
              <span class="step-note">{{ s.note }}</span>
            </div>
          </li>
        </ol>

        <p v-if="view.verifierNote" class="verifier">{{ view.verifierNote }}</p>
      </section>

      <!-- Isi laporan -->
      <section class="card-white area-content" aria-labelledby="ct-title">
        <h2 id="ct-title">Isi laporan</h2>
        <p class="card-sub">Data yang Anda kirim</p>

        <dl v-if="view.details.length" class="details">
          <div v-for="item in view.details" :key="item.label" class="detail" :class="{ 'detail--wide': item.wide }">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>

        <MediaGallery v-if="view.media.length" :items="view.media" class="track-media" />
        <p v-if="view.media.length" class="photo-note">Foto/video bukti dari pelapor. Lokasi diambil dari titik yang ditandai.</p>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import MediaGallery from '@/components/ui/MediaGallery.vue'
import { useMinLoading } from '@/composables/useMinLoading'
import { reportsApi } from '@/services/api/reports.api'
import { toMediaItems } from '@/utils/media'

const code = ref('')
const lastCode = ref('')
const loading = ref(false)
const message = ref('')
const result = ref(null)
const copied = ref(false)
const actionNote = ref('')
const showSkeleton = useMinLoading(loading, { error: message, initial: false })
const route = useRoute()

// ---------- Konstanta tampilan ----------
const STEP_LABELS = ['Dilaporkan', 'Diverifikasi', 'Diteruskan', 'Ditindaklanjuti', 'Selesai']
const STEP_DEFAULT_NOTES = [
  'Laporan diterima sistem.',
  'Laporan diperiksa oleh tim verifikator.',
  'Laporan diteruskan ke lembaga berwenang.',
  'Menunggu tanggapan lembaga.',
  'Tiket ditutup setelah ada hasil pemeriksaan.',
]
const STATUS_TO_STEP = {
  dilaporkan: 1, reported: 1, submitted: 1, diterima: 1,
  diverifikasi: 2, verified: 2,
  diteruskan: 3, forwarded: 3,
  ditindaklanjuti: 4, followed_up: 4, in_progress: 4,
  selesai: 5, done: 5, closed: 5, resolved: 5,
}
const REJECTED_STATUS = new Set(['ditolak', 'rejected'])
const CATEGORY_LABELS = { infrastructure: 'Infrastruktur', fund_flow: 'Aliran Dana', other: 'Lainnya' }
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// ---------- Helper ----------
const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '')
const pad = (n) => String(n).padStart(2, '0')

function parseDate(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
function fmtDate(v) {
  const d = parseDate(v)
  return d ? `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : ''
}
function fmtDateTime(v) {
  const d = parseDate(v)
  return d ? `${d.getDate()} ${BULAN[d.getMonth()]}, ${pad(d.getHours())}.${pad(d.getMinutes())}` : ''
}
function stepOf(v) {
  if (typeof v === 'number') return v
  const key = String(v ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_')
  const n = Number(key)
  return STATUS_TO_STEP[key] ?? (n >= 1 && n <= 5 ? n : 0)
}

/**
 * Menormalkan respons backend ke bentuk tampilan. Dibuat toleran terhadap nama field
 * karena endpoint /reports/track belum final; sesuaikan di sini, bukan di template.
 * @param {any} raw
 * @param {string} fallbackCode
 */
function normalize(raw, fallbackCode) {
  const d = raw?.report ?? raw?.data ?? raw ?? {}
  const normalizedStatus = String(d.status ?? '').toLowerCase().trim()
  const rejected = REJECTED_STATUS.has(normalizedStatus)
  const verified = ['diverifikasi', 'verified', 'selesai', 'done', 'completed'].includes(normalizedStatus)
  // Laporan ditolak dianggap berhenti di tahap verifikasi
  const current = rejected ? 2 : Math.min(5, Math.max(1, stepOf(pick(d.step, d.currentStep, d.status)) || 1))
  const createdAtRaw = pick(d.createdAt, d.created_at, d.dibuat_pada)
  const updatedAtRaw = pick(d.updatedAt, d.updated_at, d.diubah_pada)

  const rawEvents = pick(d.timeline, d.events, d.history)
  const events = Array.isArray(rawEvents) ? rawEvents : []
  const byStep = {}
  events.forEach((e) => {
    const n = stepOf(pick(e?.step, e?.status))
    if (n) byStep[n] = e
  })
  const eventAt = (e) => pick(e?.at, e?.date, e?.createdAt, e?.timestamp)

  const steps = STEP_LABELS.map((label, i) => {
    const n = i + 1
    const e = byStep[n]
    const state = n < current ? 'done' : n === current ? 'current' : 'todo'
    const at = pick(
      eventAt(e),
      n === 1 ? createdAtRaw : undefined,
      n === current && n > 1 ? updatedAtRaw : undefined,
    )
    return {
      n,
      label,
      state,
      date: state === 'todo' ? '' : fmtDateTime(at),
      note: state === 'todo' ? STEP_DEFAULT_NOTES[i] : pick(e?.note, e?.description, e?.message) ?? STEP_DEFAULT_NOTES[i],
    }
  })

  // Waktu sejak diverifikasi (ESTIMASI dari tanggal langkah 2 bila API tidak menyediakan)
  const limit = Number(pick(d.slaDays, d.deadlineDays)) || 30
  const verifiedAt = parseDate(pick(eventAt(byStep[2]), d.verifiedAt))
  let days = null
  if (d.daysSinceVerified !== undefined && d.daysSinceVerified !== null && Number.isFinite(Number(d.daysSinceVerified))) {
    days = Number(d.daysSinceVerified)
  } else if (verifiedAt && current < 5) {
    days = Math.max(0, Math.floor((Date.now() - verifiedAt.getTime()) / 86400000))
  }
  const sla = days === null ? null : { days, limit, percent: Math.min(100, Math.round((days / limit) * 100)) }

  const p = d.project ?? d.proyek ?? {}
  const agency = pick(p.agency, p.dinas, d.agency)
  const year = pick(p.year, p.tahun_anggaran, d.year)
  const project = {
    id: pick(p.id, d.projectId, d.proyek_id),
    name: pick(p.name, p.nama, d.projectName) ?? '',
    meta: [agency, pick(p.kabupaten, p.kota), year ? `TA ${year}` : ''].filter(Boolean).join(' · '),
  }

  const catRaw = pick(d.category, d.kategori)
  const category = catRaw ? CATEGORY_LABELS[catRaw] ?? String(catRaw) : ''
  const createdLabel = fmtDate(createdAtRaw)
  const anonymous = pick(d.anonymous, d.isAnonymous)
  const tags = [category, createdLabel ? `Dibuat ${createdLabel}` : '', anonymous ? 'Identitas terenkripsi' : ''].filter(Boolean)

  // Hanya field yang dikirim backend yang ditampilkan. Lokasi/ukuran lapangan muncul otomatis bila backend menambahkannya.
  const details = [
    { label: 'Kategori', value: category },
    { label: 'Kabupaten/Kota', value: pick(p.kabupaten, p.kota) },
    { label: 'Lokasi', value: pick(d.lokasi, d.location, d.alamat) },
    { label: 'Ukuran lapangan', value: pick(d.ukuran_lapangan, d.ukuranLapangan, d.fieldMeasurement, d.measurement) },
    { label: 'Keterangan', value: pick(d.keterangan, d.deskripsi, d.description), wide: true },
  ]
    .filter((x) => x.value)
    .map((x) => ({ label: x.label, value: String(x.value), wide: !!x.wide }))

  const rawMedia = pick(d.foto_urls, d.photos, d.attachments, d.media)
  const media = toMediaItems(Array.isArray(rawMedia) ? rawMedia : [])

  return {
    code: String(pick(d.tiket, d.code, d.trackingCode, d.ticket, d.ticketNumber, fallbackCode)),
    current,
    statusClass: rejected ? 'is-rejected' : verified ? 'is-verified' : 'is-pending',
    statusLabel: pick(d.statusLabel, rejected ? d.status : undefined) ?? STEP_LABELS[current - 1],
    updatedLabel: fmtDate(updatedAtRaw),
    tags,
    project,
    steps,
    sla,
    verifierNote: [
      pick(d.verifierNote, d.verificationNote, d.note, d.catatan_verifikator),
      rejected && pick(d.alasan_tolak, d.rejectReason) ? `Alasan penolakan: ${pick(d.alasan_tolak, d.rejectReason)}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    details,
    media,
  }
}

const view = computed(() => (result.value ? normalize(result.value, lastCode.value) : null))

// ---------- Aksi ----------
async function track() {
  loading.value = true
  message.value = ''
  result.value = null
  actionNote.value = ''
  const kode = code.value
  try {
    const data = await reportsApi.track(kode)
    if (data?.status === 'error') throw new Error(data.message || 'error')
    lastCode.value = kode
    result.value = data
  } catch (err) {
    message.value =
      err?.response?.status === 404
        ? 'Tiket tidak ditemukan. Periksa kembali nomor tiket Anda.'
        : 'Status tidak dapat diambil. Periksa kode dan koneksi backend.'
  } finally {
    loading.value = false
  }
}

async function copyCode() {
  if (!view.value) return
  try {
    await navigator.clipboard.writeText(view.value.code)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    actionNote.value = 'Gagal menyalin. Salin nomor secara manual.'
  }
}

function forward() {
  // TODO: backend belum menyediakan endpoint untuk meneruskan laporan ke pihak berwenang.
  actionNote.value = 'Fitur penerusan ke pihak berwenang belum tersedia.'
}

onMounted(() => {
  const initialCode = route.query?.code
  if (initialCode && typeof initialCode === 'string') {
    code.value = initialCode
    track()
  }
})
</script>

<style scoped>
.track-page {
  --accent: var(--orange, #ff6a2b);
  --accent-soft: #fff1ea;

  background: var(--bg-outer, #e9ebea);
  border-radius: 28px;
  /* atas 40px, samping 48px, bawah 64px (sesuai jarak di desain) */
  padding: clamp(20px, 3vw, 40px) clamp(20px, 4vw, 48px) clamp(28px, 4.5vw, 64px);
  margin-top: 8px;
  font-family: var(--font);
  color: var(--ink, #111);
}

/* ---------- Judul & pencarian ---------- */
.track-head { text-align: center; }
.track-head h1 { margin: 0; font-size: clamp(32px, 5vw, 48px); font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
.track-head p { margin: 10px 0 0; font-size: 16px; line-height: 1.4; color: var(--muted, #6f6f6f); }

.search {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 680px;
  height: 64px;
  margin: 22px auto 0;
  padding: 4px 6px 4px 22px;
  background: #fff;
  border: 2px solid var(--accent);
  border-radius: 999px;
  transition: box-shadow 0.15s;
}
.search:focus-within { box-shadow: 0 0 0 4px rgba(255, 106, 43, 0.18); }
.search-icon { flex: 0 0 auto; color: #555; }
.search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 18px;
  font-weight: 600;
  color: var(--ink, #111);
  padding: 0;
}
.search-input::placeholder { font-weight: 500; color: #a3a3a3; }
.search-btn {
  flex: 0 0 auto;
  height: 52px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  padding: 0 44px;
  cursor: pointer;
  transition: background 0.15s;
}
.search-btn:hover:not(:disabled) { background: #e85a1d; }
.search-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.status-row { display: flex; justify-content: center; min-height: 36px; margin: 18px 0 36px; }
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 20px;
  border-radius: 999px;
  font-size: 13.5px;
  line-height: 20px;
  font-weight: 700;
}
/* Pil "Tiket ditemukan" lebar 360px, isi rata kiri seperti di desain.
   Hapus min-width & padding-left bila ingin pil menyesuaikan isi. */
.pill--ok { min-width: min(360px, 100%); box-sizing: border-box; justify-content: flex-start; padding-left: 12px; background: #d9e6df; color: var(--green, #2a8a5a); }
.pill--error { background: var(--red-soft, #fbe6e1); color: var(--red, #d6341e); }

/* ---------- Grid hasil ---------- */
.result-grid {
  display: grid;
  grid-template-columns: minmax(0, 700fr) minmax(0, 396fr);
  grid-template-areas:
    'ticket aside'
    'timeline aside'
    'content aside';
  gap: 24px;
  align-items: start;
}
.area-ticket { grid-area: ticket; }
.area-aside { grid-area: aside; }
.area-timeline { grid-area: timeline; }
.area-content { grid-area: content; }

/* ---------- Kartu tiket (tinggi 226px, padding mengikuti desain) ---------- */
.ticket {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  min-height: 226px;
  padding: 31px 32px 12px;
  border-radius: 28px;
  color: #fff;
  background: linear-gradient(135deg, #ff6a2b 0%, #ff6f2e 100%);
}
/* Lingkaran dekoratif: besar di kanan atas, kecil di kanan bawah */
.ticket::before,
.ticket::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;
}
.ticket::before { width: 280px; height: 280px; right: -120px; top: -130px; }
.ticket::after { width: 180px; height: 180px; right: 60px; bottom: -120px; }
.ticket > * { position: relative; z-index: 1; }

.ticket-main { display: flex; flex-direction: column; align-items: flex-start; flex: 1 1 auto; min-width: 0; }
.ticket-kicker { font-size: 13px; line-height: 17px; font-weight: 500; opacity: 0.95; }
.ticket-code { margin-top: 2px; font-size: clamp(28px, 4.2vw, 40px); font-weight: 800; letter-spacing: -0.01em; line-height: 1.1; overflow-wrap: anywhere; }
.ticket-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 9px 18px;
  border-radius: 999px;
  background: #fff;
  color: #e0431f;
  font-size: 15px;
  line-height: 18px;
  font-weight: 700;
}
.ticket-dot { width: 10px; height: 10px; border-radius: 50%; background: #ff5a2b; }
.ticket-status.is-verified { background: #e3f3ea; color: #1f7a4d; }
.ticket-status.is-verified .ticket-dot { background: #34b36b; }
.ticket-status.is-rejected { background: #fbe6e1; color: #b3321b; }
.ticket-status.is-rejected .ticket-dot { background: #d6341e; }
.ticket-status.is-pending { background: #fff7e6; color: #b67800; }
.ticket-status.is-pending .ticket-dot { background: #f0a31a; }
.ticket-tags { display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 18px 0 0; padding: 0; list-style: none; }
.ticket-tags li { padding: 5px 16px; border-radius: 999px; background: rgba(120, 35, 12, 0.5); font-size: 12.5px; line-height: 16px; font-weight: 700; }

/* Kotak proyek 250 x 120, rata atas, meta menempel di bawah */
.ticket-project {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 0 0 250px;
  width: 250px;
  min-height: 120px;
  margin-top: 9px;
  padding: 16px 20px 10px;
  border-radius: 16px;
  background: rgba(105, 30, 10, 0.6);
}
.ticket-project-kicker { font-size: 12px; line-height: 15px; opacity: 0.85; }
.ticket-project strong { margin-top: 6px; font-size: 16px; font-weight: 800; line-height: 20px; }
.ticket-project-meta { margin-top: auto; padding-top: 10px; font-size: 12px; line-height: 15px; opacity: 0.8; }

/* ---------- Panel kanan ---------- */
.aside { display: grid; gap: 14px; }
.sla-card { box-sizing: border-box; background: #fff; border-radius: 24px; padding: 24px 24px 18px; margin-bottom: 11px; }
.sla-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; font-size: 14px; line-height: 20px; }
.sla-count { color: var(--red, #d6341e); font-weight: 800; font-size: 13.5px; white-space: nowrap; }
.sla-bar { height: 12px; margin-top: 10px; border-radius: 999px; background: #ececea; overflow: hidden; }
.sla-fill { height: 100%; border-radius: 999px; background: var(--accent); transition: width 0.4s; }
.sla-note { margin: 14px 0 0; font-size: 12px; line-height: 16px; color: var(--muted, #6f6f6f); }

.btn-forward {
  width: 100%;
  height: 52px;
  padding: 0 24px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-forward:hover { background: #e85a1d; }
.btn-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn-outline {
  box-sizing: border-box;
  display: grid;
  place-items: center;
  height: 50px;
  padding: 0 16px;
  border: 2px solid var(--ink, #111);
  border-radius: 999px;
  background: transparent;
  color: var(--ink, #111);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-outline:hover { background: var(--ink, #111); color: #fff; }
.btn-outline--off { opacity: 0.4; cursor: not-allowed; }
.btn-outline--off:hover { background: transparent; color: var(--ink, #111); }
.action-note { margin: 0; text-align: center; font-size: 12.5px; font-weight: 600; color: var(--red, #d6341e); }
.aside-disclaimer { margin: -8px 0 0; text-align: center; font-size: 12px; line-height: 16px; color: var(--muted, #6f6f6f); }
.btn-forward:focus-visible,
.btn-outline:focus-visible,
.search-btn:focus-visible { outline: 3px solid rgba(255, 106, 43, 0.4); outline-offset: 3px; }

/* ---------- Kartu putih ---------- */
.card-white { background: #fff; border-radius: 28px; padding: 28px 28px 26px; }
.card-white h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.2; }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.card-head p,
.card-sub { margin: 4px 0 0; font-size: 13px; line-height: 16px; color: var(--muted, #6f6f6f); }
.step-pill { flex: 0 0 auto; padding: 4px 14px; border-radius: 999px; background: #ffe9df; color: #e0431f; font-size: 12px; line-height: 16px; font-weight: 700; }

/* ---------- Linimasa ---------- */
.steps { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 36px 0 0; padding: 0; list-style: none; }
.step { position: relative; display: grid; justify-items: center; align-content: start; row-gap: 16px; padding: 0 4px; text-align: center; }
.step::before,
.step::after { content: ''; position: absolute; top: 17px; height: 3px; background: #dcdcd9; }
.step::before { left: 0; right: 50%; }
.step::after { left: 50%; right: 0; }
.step:first-child::before,
.step:last-child::after { display: none; }
.step--done::after,
.step--done::before,
.step--current::before { background: var(--green, #2a8a5a); }

.step-node {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  background: #fff;
  border: 2px solid #d6d6d3;
  color: #8a8a87;
}
.step--done .step-node { background: var(--green, #2a8a5a); border-color: var(--green, #2a8a5a); }
.step--current .step-node { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 0 0 6px rgba(255, 106, 43, 0.2); }

.step-body { display: grid; justify-items: center; gap: 0; }
.step-title { font-size: 14px; line-height: 20px; font-weight: 700; }
.step--todo .step-title { color: #6f6f6f; font-weight: 600; }
.step-now { margin-top: 3px; padding: 2px 10px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 11px; line-height: 14px; font-weight: 700; }
.step-date { margin-top: 1px; font-size: 12px; line-height: 1.4; font-weight: 700; }
.step-now + .step-date { margin-top: 15px; }
.step-note { max-width: 110px; font-size: 12px; line-height: 1.4; color: #77776f; }

.verifier {
  margin: 30px 0 0;
  padding: 12px 16px;
  border-left: 4px solid var(--green, #2a8a5a);
  border-radius: 6px 14px 14px 6px;
  background: #f5f5f3;
  font-size: 12px;
  line-height: 1.5;
  color: #55554f;
}

/* ---------- Isi laporan ---------- */
.details { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 0; }
.detail { padding: 15px 10px 15px 0; }
.detail:nth-child(even):not(.detail--wide) { padding-left: 10px; padding-right: 0; }
.detail--wide { grid-column: 1 / -1; padding-right: 0; }
.detail--wide,
.detail:nth-child(n + 3) { border-top: 1px solid var(--line, #ebe7e2); }
.detail dt { font-size: 12px; line-height: 16px; font-weight: 600; color: #6f6f6f; }
.detail dd { margin: 4px 0 0; font-size: 15px; font-weight: 700; line-height: 1.3; white-space: pre-line; overflow-wrap: anywhere; }

.track-media { margin-top: 15px; }
.photos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 15px; }
.photo {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  height: 118px;
  margin: 0;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(135deg, #e6dcd2 0%, #d7e0d9 100%);
  color: #8a8a86;
}
.photo img { width: 100%; height: 100%; object-fit: cover; }
.photo figcaption { font-size: 12.5px; font-weight: 600; }
.photo-note { margin: 10px 0 0; font-size: 12px; line-height: 16px; color: var(--muted, #6f6f6f); }

/* ---------- Responsif ---------- */
@media (max-width: 991.98px) {
  .result-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'ticket' 'aside' 'timeline' 'content';
  }
}
@media (max-width: 767.98px) {
  /* Linimasa menjadi vertikal */
  .steps { grid-template-columns: minmax(0, 1fr); margin-top: 24px; }
  .step { grid-template-columns: 36px minmax(0, 1fr); column-gap: 16px; justify-items: start; text-align: left; padding: 0 0 22px; }
  .step:last-child { padding-bottom: 0; }
  .step::before { display: none; }
  .step::after { left: 16.5px; right: auto; top: 38px; bottom: -2px; width: 3px; height: auto; }
  .step-body { justify-items: start; }
  .step-note { max-width: none; }
}
@media (max-width: 575.98px) {
  .track-page { border-radius: 20px; }
  .search { padding-left: 16px; gap: 10px; }
  .search-icon { display: none; }
  .search-btn { padding: 0 24px; }
  .ticket { flex-direction: column; align-items: stretch; min-height: 0; padding: 24px 20px; }
  .ticket-project { flex: 0 0 auto; width: 100%; margin-top: 0; }
  .card-white { padding: 22px 18px; border-radius: 22px; }
  .details { grid-template-columns: 1fr; }
  .detail,
  .detail:nth-child(even):not(.detail--wide) { padding-left: 0; padding-right: 0; }
  .detail:nth-child(n + 2) { border-top: 1px solid var(--line, #ebe7e2); }
  .photos { gap: 8px; }
  .photo { height: 96px; border-radius: 14px; }
}
@media (pointer: coarse) {
  .search-input { font-size: 16px; } /* mencegah iOS auto-zoom saat fokus */
}
@media (prefers-reduced-motion: reduce) {
  .sla-fill, .search, .btn-forward, .btn-outline, .search-btn { transition: none; }
}
</style>