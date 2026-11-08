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
          class="arx-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="arx-title"
          tabindex="-1"
          @keydown.esc.stop="close"
        >
          <header class="arx-head">
            <h3 id="arx-title" class="arx-title">Tolak laporan</h3>
            <button type="button" class="arx-close" aria-label="Tutup" @click="close">×</button>
          </header>

          <div class="arx-body">
            <p v-if="error" class="arx-alert" role="alert">{{ error }}</p>

            <!-- Kartu radio alasan — sesuai frame 03b (radio + judul + deskripsi) -->
            <div class="arx-field">
              <label class="arx-field-label">
                Alasan penolakan <span class="arx-req" aria-hidden="true">*</span>
              </label>
              <div class="arx-radio-group" role="radiogroup" aria-label="Alasan penolakan">
                <label
                  v-for="opt in alasanOptions"
                  :key="opt.value"
                  class="arx-radio-card"
                  :class="{ 'is-selected': alasan === opt.value }"
                >
                  <input
                    type="radio"
                    class="arx-radio-input"
                    :value="opt.value"
                    v-model="alasan"
                    :disabled="loading"
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

            <div v-if="alasan === '__other__'" class="arx-field">
              <label for="arx-alasan-lain">
                Tulis alasan lain <span class="arx-req" aria-hidden="true">*</span>
              </label>
              <textarea
                id="arx-alasan-lain"
                v-model="alasanLain"
                class="arx-textarea"
                rows="3"
                maxlength="500"
                placeholder="Jelaskan alasan penolakan…"
                :disabled="loading"
              ></textarea>
            </div>

            <div class="arx-field">
              <label for="arx-catatan">
                Catatan verifikator
                <span class="arx-optional">(opsional)</span>
              </label>
              <textarea
                id="arx-catatan"
                v-model="catatan"
                class="arx-textarea"
                rows="4"
                maxlength="2000"
                placeholder="Catatan internal untuk verifikator lain…"
                :disabled="loading"
              ></textarea>
              <p class="arx-counter" :class="{ 'is-max': catatan.length >= 2000 }">
                {{ catatan.length }} / 2000
              </p>
            </div>
          </div>

          <footer class="arx-foot">
            <button type="button" class="arx-btn arx-btn-ghost" :disabled="loading" @click="close">
              Batal
            </button>
            <button type="button" class="arx-btn arx-btn-danger" :disabled="!canSubmit" @click="submit">
              {{ loading ? 'Memproses…' : 'Tolak laporan' }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { adminReportsApi } from '@/services/api'
import { ALASAN_TOLAK_OPTIONS } from '@/features/admin/config/reports'

const props = defineProps({
  show: { type: Boolean, default: false },
  tiket: { type: String, default: '' },
})
const emit = defineEmits(['close', 'success'])

const dialogRef = ref(null)
const alasan = ref('')
const alasanLain = ref('')
const catatan = ref('')
const loading = ref(false)
const error = ref('')

// Opsi preset + pilihan "alasan lain" yang membuka textarea.
const alasanOptions = computed(() => [
  ...ALASAN_TOLAK_OPTIONS.map((o) => ({ value: o.value, label: o.value, desc: o.desc })),
  { value: '__other__', label: 'Alasan lain…', desc: '' },
])

// Nilai akhir alasan_tolak: preset, atau teks bebas jika "alasan lain".
const finalAlasan = computed(() =>
  alasan.value === '__other__' ? alasanLain.value.trim() : alasan.value,
)

const canSubmit = computed(() => !!finalAlasan.value && !loading.value)

function close() {
  if (loading.value) return
  emit('close')
}

function reset() {
  alasan.value = ''
  alasanLain.value = ''
  catatan.value = ''
  error.value = ''
  loading.value = false
}

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    await adminReportsApi.verify(props.tiket, {
      status: 'Ditolak',
      alasan_tolak: finalAlasan.value,
      catatan_verifikator: catatan.value.trim() || undefined,
    })
    emit('success')
  } catch (err) {
    // 400 = transisi tidak sah (mis. status sudah berubah); backend memberi pesan.
    error.value = err?.userMessage || err?.message || 'Gagal menolak laporan.'
  } finally {
    loading.value = false
  }
}

// Reset form + kunci scroll + arahkan fokus saat modal dibuka.
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
/* Backdrop + kartu — token §9 admin, tanpa bayangan (§10). */
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
.arx-field:last-child { margin-bottom: 0; }
.arx-field label,
.arx-field-label {
  display: block;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-ink);
  margin-bottom: 6px;
}
.arx-req { color: var(--c-danger); }
.arx-optional { font-weight: 400; color: var(--c-subtle); }

/* ── Kartu radio alasan (frame 03b) ── */
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

.arx-textarea {
  width: 100%;
  font-family: var(--font);
  font-size: var(--fs-sm);
  color: var(--c-ink);
  background: var(--c-surface);
  border: var(--bw) solid var(--c-border-strong);
  border-radius: var(--r-sm);
  padding: 10px 12px;
  resize: vertical;
  line-height: 1.5;
  transition: border-color 0.15s;
}
.arx-textarea:focus {
  outline: none;
  border-color: var(--c-primary);
}
.arx-textarea:disabled { opacity: 0.6; cursor: not-allowed; }

.arx-counter {
  margin: 4px 0 0;
  text-align: right;
  font-size: var(--fs-xs);
  color: var(--c-subtle);
}
.arx-counter.is-max { color: var(--c-danger); }

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
.arx-btn-danger {
  background: var(--c-danger);
  border: var(--bw) solid var(--c-danger);
  color: var(--c-surface);
}
.arx-btn-danger:hover:not(:disabled) { background: #c2341a; }

.arx-fade-enter-active,
.arx-fade-leave-active { transition: opacity 0.2s ease; }
.arx-fade-enter-from,
.arx-fade-leave-to { opacity: 0; }

@media (max-width: 575.98px) {
  .arx-backdrop { align-items: flex-end; padding: 0; }
  .arx-card { width: 100%; max-height: 88vh; border-radius: var(--r-xl) var(--r-xl) 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  .arx-fade-enter-active,
  .arx-fade-leave-active { transition: none; }
}
</style>
