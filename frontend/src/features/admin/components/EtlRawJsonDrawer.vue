<template>
  <div v-if="open" class="drawer-backdrop" @click.self="$emit('close')">
    <div class="drawer-panel" role="dialog" aria-modal="true">
      <!-- Head -->
      <div class="drawer-head">
        <div>
          <span class="drawer-badge">GAGAL VALIDASI SKEMA</span>
          <h3 class="drawer-title">#{{ errorItem?.id || 'ERR-000' }} · {{ errorItem?.source_id || 'Sumber Data' }}</h3>
        </div>
        <button class="drawer-close-btn" aria-label="Tutup drawer" @click="$emit('close')">✕</button>
      </div>

      <div class="drawer-body">
        <!-- Error explanation box -->
        <div class="drawer-box is-error">
          <strong class="drawer-box-title">Pelanggaran Format Data:</strong>
          <p class="drawer-error-desc">{{ errorItem?.alasan || 'Format baris tidak sesuai dengan skema yang diharapkan.' }}</p>
        </div>

        <!-- Raw JSON block -->
        <div class="drawer-code-wrap">
          <div class="drawer-code-head">
            <span class="drawer-code-title">PAYLOAD MENTAH / RAW JSON</span>
            <button class="drawer-copy-btn" @click="copyJson">
              {{ copied ? 'Tersalin!' : 'Salin JSON ⎘' }}
            </button>
          </div>
          <pre class="drawer-code-content"><code>{{ formattedJson }}</code></pre>
        </div>

        <!-- Diagnostic box -->
        <div class="drawer-box is-diag">
          <h4 class="drawer-diag-title">DIAGNOSTIK SKEMA &amp; TINDAK LANJUT</h4>
          <dl class="drawer-diag-list">
            <div class="drawer-diag-row">
              <dt>Sumber Data:</dt>
              <dd><code>{{ errorItem?.source_id || '—' }}</code></dd>
            </div>
            <div class="drawer-diag-row">
              <dt>Status Integrasi:</dt>
              <dd><span class="diag-status-pill">Ditolak Otomatis</span></dd>
            </div>
            <div class="drawer-diag-row">
              <dt>Rekomendasi:</dt>
              <dd>Periksa kepatuhan kolom pada berkas asal sebelum sinkronisasi ulang.</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Footer -->
      <div class="drawer-foot">
        <button class="drawer-btn-done" @click="$emit('close')">Tutup</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  errorItem: { type: Object, default: null },
})

defineEmits(['close'])

const copied = ref(false)

const formattedJson = computed(() => {
  if (!props.errorItem?.baris_mentah) return '{\n  "info": "Tidak ada payload mentah"\n}'
  try {
    return JSON.stringify(props.errorItem.baris_mentah, null, 2)
  } catch {
    return String(props.errorItem.baris_mentah)
  }
})

async function copyJson() {
  try {
    await navigator.clipboard.writeText(formattedJson.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    copied.value = false
  }
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.4);
  z-index: 1060;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: var(--c-surface);
  border-left: var(--bw) solid var(--c-border);
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-head {
  padding: 20px;
  border-bottom: var(--bw) solid var(--c-border);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.drawer-badge {
  display: inline-block;
  font-size: var(--fs-micro);
  font-weight: 800;
  color: var(--c-danger);
  background: var(--c-danger-soft);
  padding: 2px 8px;
  border-radius: var(--r-pill);
  margin-bottom: 4px;
}
.drawer-title {
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--c-ink);
  margin: 0;
}
.drawer-close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--c-muted);
  cursor: pointer;
  padding: 4px;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.drawer-box {
  padding: 14px;
  border-radius: var(--r-md);
  font-size: var(--fs-xs);
}
.drawer-box.is-error {
  background: var(--c-danger-soft);
  border: 1px solid rgba(214, 58, 31, 0.25);
  color: var(--c-ink);
}
.drawer-box-title {
  color: var(--c-danger);
  display: block;
  margin-bottom: 4px;
}
.drawer-error-desc {
  margin: 0;
  line-height: 1.45;
}

.drawer-code-wrap {
  border: var(--bw) solid var(--c-border-strong);
  border-radius: var(--r-md);
  background: #1A1918;
  color: #F4F2EE;
  overflow: hidden;
}
.drawer-code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #242220;
  border-bottom: 1px solid #333;
}
.drawer-code-title {
  font-size: var(--fs-micro);
  font-weight: 700;
  color: var(--c-subtle);
  letter-spacing: 0.5px;
}
.drawer-copy-btn {
  background: none;
  border: 1px solid #444;
  color: #FFF;
  border-radius: var(--r-xs);
  padding: 2px 8px;
  font-size: var(--fs-micro);
  cursor: pointer;
}
.drawer-code-content {
  margin: 0;
  padding: 12px;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 260px;
}

.drawer-box.is-diag {
  background: var(--c-bg-alt);
  border: 1px solid var(--c-border);
}
.drawer-diag-title {
  font-size: var(--fs-micro);
  font-weight: 800;
  color: var(--c-muted);
  margin: 0 0 10px 0;
  letter-spacing: 0.5px;
}
.drawer-diag-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.drawer-diag-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  font-size: var(--fs-xs);
  gap: 8px;
}
.drawer-diag-row dt {
  color: var(--c-muted);
  font-weight: 600;
}
.drawer-diag-row dd {
  margin: 0;
  color: var(--c-ink);
}
.diag-status-pill {
  font-size: var(--fs-micro);
  font-weight: 700;
  background: var(--c-danger-soft);
  color: var(--c-danger);
  padding: 1px 6px;
  border-radius: var(--r-pill);
}

.drawer-foot {
  padding: 16px 20px;
  border-top: var(--bw) solid var(--c-border);
  display: flex;
  justify-content: flex-end;
}
.drawer-btn-done {
  height: 36px;
  padding: 0 20px;
  background: var(--c-ink);
  color: #FFF;
  border: none;
  border-radius: var(--r-sm);
  font-size: var(--fs-sm);
  font-weight: 600;
  cursor: pointer;
}
</style>
