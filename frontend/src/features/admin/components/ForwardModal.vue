<template>
  <Teleport to="body">
    <Transition name="arx-fade">
      <div
        v-if="show"
        class="arx-backdrop"
        @click.self="close"
      >
        <section
          ref="dialogRef"
          class="arx-card arx-card--wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="arf-title"
          tabindex="-1"
          @keydown.esc.stop="close"
        >
          <header class="arx-head">
            <h3 id="arf-title" class="arx-title">Teruskan ke lembaga</h3>
            <button type="button" class="arx-close" aria-label="Tutup" @click="close">×</button>
          </header>

          <div class="arx-body">
            <p v-if="sendError" class="arx-alert" role="alert">{{ sendError }}</p>

            <!-- Kartu radio lembaga — sesuai frame 03c (radio + label + deskripsi) -->
            <div class="arx-field">
              <label class="arx-field-label">
                Lembaga tujuan <span class="arx-req" aria-hidden="true">*</span>
              </label>
              <div class="arx-radio-group" role="radiogroup" aria-label="Lembaga tujuan">
                <label
                  v-for="opt in LEMBAGA_OPTIONS"
                  :key="opt.value"
                  class="arx-radio-card"
                  :class="{ 'is-selected': lembaga === opt.value }"
                >
                  <input
                    type="radio"
                    class="arx-radio-input"
                    :value="opt.value"
                    v-model="lembaga"
                    :disabled="sending"
                  />
                  <span class="arx-radio-outer" aria-hidden="true">
                    <span class="arx-radio-inner"></span>
                  </span>
                  <span class="arx-radio-text">
                    <span class="arx-radio-title">{{ opt.label }}</span>
                    <span v-if="opt.desc" class="arx-radio-desc">{{ opt.desc }}</span>
                  </span>
                </label>
              </div>
            </div>

            <!-- Pratinjau draf surat tindak lanjut -->
            <div v-if="lembaga" class="draft">
              <div class="draft-head">
                <span class="draft-label">Pratinjau draf surat</span>
                <span v-if="generatedLabel" class="draft-badge" :class="`draft-badge--${draft?.generated_by}`">
                  {{ generatedLabel }}
                </span>
              </div>

              <div v-if="draftLoading" class="draft-state">Memproses…</div>

              <template v-else-if="draftError">
                <p class="draft-error">{{ draftError }}</p>
                <p class="draft-hint">Draf cadangan tetap dapat dikirim tanpa pratinjau.</p>
              </template>

              <div v-else-if="draft" class="draft-fields">
                <p v-if="draft.kepada" class="draft-line"><b>Kepada:</b> {{ draft.kepada }}</p>
                <p v-if="draft.perihal" class="draft-line"><b>Perihal:</b> {{ draft.perihal }}</p>
                <p v-if="draft.pembuka" class="draft-para">{{ draft.pembuka }}</p>

                <template v-if="uraianItems.length">
                  <p class="draft-sub">Uraian indikator</p>
                  <ul class="draft-list">
                    <li v-for="(u, i) in uraianItems" :key="i" class="draft-list-item">
                      <span v-if="u.kode_aturan" class="draft-rule">{{ u.kode_aturan }}</span>
                      <span v-if="u.penjelasan" class="draft-explain">{{ u.penjelasan }}</span>
                      <span v-if="u.arti_bagi_warga" class="draft-arti">Arti bagi warga: {{ u.arti_bagi_warga }}</span>
                      <span v-if="typeof u === 'string'" class="draft-explain">{{ u }}</span>
                    </li>
                  </ul>
                </template>

                <p v-if="draft.permohonan" class="draft-para">{{ draft.permohonan }}</p>
                <p v-if="draft.penutup" class="draft-para">{{ draft.penutup }}</p>
              </div>

              <p v-else-if="!proyekId" class="draft-state">
                Laporan ini tidak terkait proyek mana pun, sehingga draf surat tidak dapat dibuat.
              </p>

              <!-- Penafian LLM — selalu ditampilkan, tidak pernah dihilangkan. -->
              <p class="draft-penafian">{{ penafianText }}</p>
            </div>
          </div>

          <footer class="arx-foot">
            <button type="button" class="arx-btn arx-btn-ghost" :disabled="sending" @click="close">
              Batal
            </button>
            <button type="button" class="arx-btn arx-btn-primary" :disabled="!canSend" @click="send">
              {{ sending ? 'Memproses…' : 'Kirim ke lembaga' }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { adminReportsApi, projectsApi } from '@/services/api'
import { LEMBAGA_OPTIONS } from '@/features/admin/config/reports'

const props = defineProps({
  show: { type: Boolean, default: false },
  tiket: { type: String, default: '' },
  proyekId: { type: [String, null], default: null },
})
const emit = defineEmits(['close', 'success'])

const dialogRef = ref(null)
const lembaga = ref('')
const draft = ref(null)
const draftLoading = ref(false)
const draftError = ref('')
const sending = ref(false)
const sendError = ref('')

// Penafian baku bila draf belum tersedia — tetap ditampilkan (tidak pernah dihilangkan).
const DEFAULT_PENAFIAN =
  'Draf ini dihasilkan oleh model bahasa (LLM) sebagai bahan rujukan. Periksa kembali isi dan lampiran sebelum dikirim.'

const uraianItems = computed(() => {
  const arr = draft.value?.uraian_indikator
  return Array.isArray(arr) ? arr : []
})

const penafianText = computed(() => draft.value?.penafian || DEFAULT_PENAFIAN)

const generatedLabel = computed(() => {
  const g = draft.value?.generated_by
  if (g === 'llm') return 'Dibuat oleh AI'
  if (g === 'cache') return 'Draf tersimpan'
  if (g === 'fallback') return 'Draf cadangan'
  return null
})

const canSend = computed(() => !!lembaga.value && !sending.value)

function close() {
  if (sending.value) return
  emit('close')
}

function reset() {
  lembaga.value = ''
  draft.value = null
  draftLoading.value = false
  draftError.value = ''
  sending.value = false
  sendError.value = ''
}

async function fetchDraft() {
  if (!props.proyekId || !lembaga.value) {
    draft.value = null
    return
  }
  draftLoading.value = true
  draftError.value = ''
  draft.value = null
  try {
    draft.value = await projectsApi.draft(props.proyekId, lembaga.value)
  } catch (err) {
    // Draf gagal dimuat — draf cadangan masih dapat dikirim, jadi tombol kirim tetap aktif.
    draft.value = null
    draftError.value = err?.userMessage || err?.message || 'Gagal memuat draf surat.'
  } finally {
    draftLoading.value = false
  }
}

async function send() {
  if (!canSend.value) return
  sending.value = true
  sendError.value = ''
  try {
    await adminReportsApi.forward(props.tiket, lembaga.value)
    emit('success')
  } catch (err) {
    // 400 = meneruskan dari status yang tidak sah; backend memberi pesan.
    sendError.value = err?.userMessage || err?.message || 'Gagal meneruskan laporan.'
  } finally {
    sending.value = false
  }
}

// Saat lembaga berganti: bersihkan pratinjau lalu ambil draf bila konteks proyek ada.
watch(lembaga, () => {
  draft.value = null
  draftError.value = ''
  sendError.value = ''
  if (lembaga.value && props.proyekId) fetchDraft()
})

// Reset + kunci scroll + fokus saat modal dibuka.
watch(
  () => props.show,
  async (open) => {
    if (open) {
      reset()
      document.body.style.overflow = 'hidden'
      await nextTick()
      dialogRef.value?.focus()
    } else {
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Backdrop + kartu — identik dengan RejectModal (token §9 admin, tanpa bayangan §10). */
.arx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
  background: rgba(17, 17, 17, 0.45);
}
.arx-card {
  display: flex;
  flex-direction: column;
  width: min(480px, 100%);
  max-height: min(560px, 100%);
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border-strong);
  border-radius: var(--r-lg); /* 12 */
  outline: none;
  overflow: hidden;
}
.arx-card--wide { width: min(600px, 100%); max-height: min(680px, 100%); }

.arx-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-5) var(--sp-3);
  border-bottom: var(--bw) solid var(--c-border);
}
.arx-title {
  margin: 0;
  font-size: var(--fs-lg); /* 13 */
  font-weight: 700;
  color: var(--c-ink);
}
.arx-close {
  flex: none;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--c-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.arx-close:hover { background: var(--c-bg); color: var(--c-ink); }

.arx-body {
  flex: 1;
  min-height: 80px;
  overflow-y: auto;
  padding: var(--sp-4) var(--sp-5);
}

.arx-alert {
  margin: 0 0 var(--sp-3);
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--c-danger-soft);
  color: var(--c-danger);
  font-size: var(--fs-sm);
  font-weight: 500;
}

.arx-field { margin-bottom: var(--sp-4); }
.arx-field label,
.arx-field-label {
  display: block;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-ink);
  margin-bottom: 6px;
}
.arx-req { color: var(--c-danger); }

/* ── Kartu radio lembaga (frame 03c) ── */
.arx-radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2); /* 8 */
}
.arx-radio-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3); /* 12 — radio x≈472, teks x≈502 */
  padding: var(--sp-3) var(--sp-4); /* 12 × 16 */
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border); /* #E7E3DC tak terpilih */
  border-radius: var(--r-md); /* 8 */
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.arx-radio-card:hover { border-color: var(--c-border-strong); }
.arx-radio-card.is-selected {
  border-color: var(--c-primary); /* #FF6B2B terpilih */
  background: var(--c-primary-soft); /* #FFF2EB — aksen hangat terpilih */
}
/* Radio asli disembunyikan tetap dapat diakses keyboard */
.arx-radio-input {
  position: absolute;
  opacity: 0;
  inset: 0;
  cursor: pointer;
  margin: 0;
}
.arx-radio-input:focus-visible + .arx-radio-outer {
  outline: 2px solid var(--c-primary);
  outline-offset: 2px;
}
.arx-radio-input:disabled { cursor: not-allowed; }
.arx-radio-card:has(.arx-radio-input:disabled) { opacity: 0.6; cursor: not-allowed; }

.arx-radio-outer {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 1px; /* sejajar dengan baris judul */
  border-radius: var(--r-pill); /* lingkaran */
  border: 1.5px solid var(--c-border-strong); /* #DCD8D0 tak terpilih */
  background: var(--c-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s;
}
.arx-radio-inner {
  width: 10px;
  height: 10px;
  border-radius: var(--r-pill);
  background: var(--c-primary); /* #FF6B2B dot terpilih */
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.15s, transform 0.15s;
}
.arx-radio-card.is-selected .arx-radio-outer { border-color: var(--c-primary); }
.arx-radio-card.is-selected .arx-radio-inner { opacity: 1; transform: scale(1); }

.arx-radio-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.arx-radio-title {
  font-size: var(--fs-sm); /* 11 — Bold */
  font-weight: 700;
  color: var(--c-ink); /* #111111 */
  line-height: 1.3;
}
.arx-radio-desc {
  font-size: var(--fs-xs); /* 10 — Medium */
  font-weight: 500;
  color: var(--c-muted); /* #6B6760 */
  line-height: 1.4;
}

/* Draf surat */
.draft {
  border: var(--bw) solid var(--c-border);
  border-radius: var(--r-md);
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-bg-alt);
}
.draft-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.draft-label {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-subtle);
}
.draft-badge {
  font-size: var(--fs-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  background: var(--c-info-soft);
  color: var(--c-info);
}
.draft-badge--fallback { background: var(--c-warning-soft); color: var(--c-warning); }
.draft-badge--cache { background: var(--c-success-soft); color: var(--c-success); }

.draft-state {
  font-size: var(--fs-sm);
  color: var(--c-muted);
  padding: var(--sp-2) 0;
}
.draft-error {
  margin: 0 0 4px;
  font-size: var(--fs-sm);
  color: var(--c-danger);
}
.draft-hint {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--c-subtle);
}

.draft-fields { display: flex; flex-direction: column; gap: var(--sp-2); }
.draft-line { margin: 0; font-size: var(--fs-sm); color: var(--c-ink); }
.draft-line b { font-weight: 700; }
.draft-para {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: 1.55;
  color: var(--c-ink);
  white-space: pre-wrap;
}
.draft-sub {
  margin: var(--sp-2) 0 4px;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-subtle);
}
.draft-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.draft-list-item {
  padding-left: var(--sp-3);
  border-left: 2px solid var(--c-border-strong);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.draft-rule {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-primary-text);
}
.draft-explain { font-size: var(--fs-sm); color: var(--c-ink); line-height: 1.5; }
.draft-arti { font-size: var(--fs-xs); color: var(--c-muted); }

/* Penafian — selalu tampil */
.draft-penafian {
  margin: var(--sp-3) 0 0;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--c-warning-soft);
  color: var(--c-warning);
  font-size: var(--fs-xs);
  line-height: 1.5;
}

.arx-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5) calc(var(--sp-4) + env(safe-area-inset-bottom));
  border-top: var(--bw) solid var(--c-border);
  background: var(--c-bg-alt);
}

.arx-btn {
  height: 36px;
  padding: 0 16px;
  font-family: var(--font);
  font-size: var(--fs-sm);
  font-weight: 700;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.arx-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.arx-btn-ghost {
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border-strong);
  color: var(--c-muted);
  font-weight: 600;
}
.arx-btn-ghost:hover:not(:disabled) { background: var(--c-bg); color: var(--c-ink); }
.arx-btn-primary {
  background: var(--c-primary);
  border: var(--bw) solid var(--c-primary);
  color: var(--c-ink); /* §7+§8: teks gelap pada primer */
}
.arx-btn-primary:hover:not(:disabled) { background: #f57f1a; }

.arx-fade-enter-active,
.arx-fade-leave-active { transition: opacity 0.2s ease; }
.arx-fade-enter-from,
.arx-fade-leave-to { opacity: 0; }

@media (max-width: 575.98px) {
  .arx-backdrop { align-items: flex-end; padding: 0; }
  .arx-card { width: 100% !important; max-height: 88vh; border-radius: var(--r-xl) var(--r-xl) 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  .arx-fade-enter-active,
  .arx-fade-leave-active { transition: none; }
}
</style>
