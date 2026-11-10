<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="show"
        class="modal-backdrop"
        @click.self="close"
      >
        <section
          ref="dialogRef"
          class="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabindex="-1"
          @keydown.esc.stop="close"
        >
          <!-- Header Modal Sesuai Standar Panel Admin -->
          <header class="modal-head">
            <button type="button" class="btn-close" aria-label="Tutup modal" @click="close">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          <div class="modal-body">
            <!-- Banner Peringatan Konsekuensi Penolakan -->
            <div class="alert-block alert-block--warning">
              <div class="alert-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#B45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div class="alert-content">
                <div class="alert-title">KONSEKUENSI PENOLAKAN LAPORAN:</div>
                <p>
                  Laporan warga ini akan ditutup dengan status <code>ditolak</code>. Alasan penolakan akan dicatat ke dalam rekam jejak audit dan diteruskan ke kontak pelapor (jika disediakan).
                </p>
              </div>
            </div>

            <!-- Error Banner jika request gagal -->
            <div v-if="error" class="alert-block alert-block--danger" role="alert">
              <div class="alert-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div class="alert-content">
                <p>{{ error }}</p>
              </div>
            </div>

            <!-- Kartu radio alasan penolakan -->
            <div class="form-group">
              <label class="form-label">
                ALASAN PENOLAKAN <span class="req-star" aria-hidden="true">*</span>
              </label>
              <div class="radio-group" role="radiogroup" aria-label="Alasan penolakan">
                <label
                  v-for="opt in alasanOptions"
                  :key="opt.value"
                  class="radio-card"
                  :class="{ 'is-selected': alasan === opt.value }"
                >
                  <input
                    type="radio"
                    class="radio-input"
                    :value="opt.value"
                    v-model="alasan"
                    :disabled="loading"
                  />
                  <span class="radio-outer" aria-hidden="true">
                    <span class="radio-inner"></span>
                  </span>
                  <div class="radio-text">
                    <span class="radio-title">{{ opt.label }}</span>
                    <span v-if="opt.desc" class="radio-desc">{{ opt.desc }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Alasan Spesifik jika memilih 'Alasan lain' -->
            <div v-if="alasan === '__other__'" class="form-group">
              <label for="arx-alasan-lain" class="form-label">
                TULIS ALASAN SPESIFIK <span class="req-star" aria-hidden="true">*</span>
              </label>
              <textarea
                id="arx-alasan-lain"
                v-model="alasanLain"
                class="form-textarea"
                rows="3"
                maxlength="500"
                placeholder="Jelaskan alasan penolakan secara spesifik…"
                :disabled="loading"
              ></textarea>
            </div>

            <!-- Catatan Verifikator Tambahan -->
            <div class="form-group">
              <label for="arx-catatan" class="form-label">
                CATATAN VERIFIKATOR
                <span class="optional-tag">(OPSIONAL)</span>
              </label>
              <textarea
                id="arx-catatan"
                v-model="catatan"
                class="form-textarea"
                rows="3"
                maxlength="2000"
                placeholder="Catatan internal untuk tim verifikator dan tindak lanjut…"
                :disabled="loading"
              ></textarea>
              <p class="char-counter" :class="{ 'is-max': catatan.length >= 2000 }">
                {{ catatan.length }} / 2000
              </p>
            </div>
          </div>

          <!-- Footer Modal Sesuai Standar Panel Admin -->
          <footer class="modal-foot">
            <button type="button" class="btn-cancel" :disabled="loading" @click="close">
              Batal
            </button>
            <button type="button" class="btn-danger" :disabled="!canSubmit" @click="submit">
              <svg v-if="!loading" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <svg v-else class="spin-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span>{{ loading ? 'Memproses…' : 'Konfirmasi Tolak Laporan' }}</span>
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
  { value: '__other__', label: 'Alasan lain…', desc: 'Tuliskan alasan penolakan secara spesifik di bawah' },
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
/* Backdrop & Card Konsisten Panel Admin */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
}

.modal-card {
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
}

/* Header Modal */
.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #E2E8F0;
  background: #FFFFFF;
}

.modal-head-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge-reject {
  align-self: flex-start;
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #DC2626;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 2px;
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1.3;
}

.text-danger {
  color: #DC2626;
}

.modal-sub {
  margin: 0;
  font-size: 12px;
  color: #64748B;
  line-height: 1.4;
}

.modal-sub strong {
  color: #1E293B;
  font-family: monospace;
}

.btn-close {
  flex: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #F8FAFC;
  color: #64748B;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-close:hover {
  background: #F1F5F9;
  color: #0F172A;
  border-color: #CBD5E1;
}

/* Body Modal */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Alert Banners */
.alert-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.alert-icon {
  flex: none;
  margin-top: 2px;
}

.alert-content {
  flex: 1;
}

.alert-block--warning {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  color: #92400E;
}

.alert-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 3px;
}

.alert-block--warning p {
  margin: 0;
  font-size: 11.5px;
}

.alert-block--warning code {
  background: #FEF3C7;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 600;
}

.alert-block--danger {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #991B1B;
}

.alert-block--danger p {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
}

/* Form Controls */
.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #475467;
  margin-bottom: 8px;
}

.req-star {
  color: #EF4444;
}

.optional-tag {
  font-size: 10px;
  font-weight: 500;
  color: #94A3B8;
  letter-spacing: normal;
}

/* Radio Group & Cards */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 14px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.radio-card:hover {
  background: #F8FAFC;
  border-color: #CBD5E1;
}

.radio-card.is-selected {
  border-color: #ff5c00;
  background: #FFF7ED;
  box-shadow: 0 1px 3px rgba(255, 92, 0, 0.08);
}

.radio-input {
  position: absolute;
  opacity: 0;
  inset: 0;
  cursor: pointer;
  margin: 0;
}

.radio-outer {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 999px;
  border: 1.5px solid #CBD5E1;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.radio-inner {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ff5c00;
  opacity: 0;
  transform: scale(0.4);
  transition: all 0.15s ease;
}

.radio-card.is-selected .radio-outer {
  border-color: #ff5c00;
}

.radio-card.is-selected .radio-inner {
  opacity: 1;
  transform: scale(1);
}

.radio-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.radio-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1.3;
}

.radio-desc {
  font-size: 11px;
  color: #64748B;
  line-height: 1.4;
}

/* Textareas */
.form-textarea {
  width: 100%;
  font-family: inherit;
  font-size: 12.5px;
  color: #0F172A;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 8px;
  padding: 10px 12px;
  resize: vertical;
  line-height: 1.5;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: #ff5c00;
  box-shadow: 0 0 0 3px rgba(255, 92, 0, 0.12);
}

.form-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #F8FAFC;
}

.char-counter {
  margin: 4px 0 0;
  text-align: right;
  font-size: 11px;
  color: #94A3B8;
}

.char-counter.is-max {
  color: #DC2626;
  font-weight: 600;
}

/* Footer Modal */
.modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px;
  border-top: 1px solid #E2E8F0;
  background: #F8FAFC;
}

.btn-cancel {
  height: 38px;
  padding: 0 16px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover:not(:disabled) {
  background: #F1F5F9;
  border-color: #94A3B8;
  color: #0F172A;
}

.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  height: 38px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #FFFFFF;
  background: #DC2626;
  border: 1px solid #DC2626;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(220, 38, 38, 0.2);
  transition: all 0.15s ease;
}

.btn-danger:hover:not(:disabled) {
  background: #B91C1C;
  border-color: #B91C1C;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 575.98px) {
  .modal-backdrop {
    align-items: flex-end;
    padding: 0;
  }
  .modal-card {
    width: 100%;
    max-height: 88vh;
    border-radius: 16px 16px 0 0;
  }
}
</style>
