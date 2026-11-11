<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="close">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <div class="modal-head">
        <h3 id="delete-title" class="modal-title text-danger">Konfirmasi Hapus Proyek Manual</h3>
        <button class="btn-close" aria-label="Tutup modal" @click="close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Kasus Tidak Boleh Dihapus: Data Pemerintah -->
        <div v-if="project?.asal_data === 'pemerintah'" class="alert-block alert-block--danger">
          <strong>AKSES DITOLAK: DATA RESMI PEMERINTAH</strong>
          <p>
            Proyek <strong>{{ project?.nama }}</strong> bersumber langsung dari pipa ETL SiRUP/SPSE resmi pemerintah.
            Data ini dilindungi oleh integritas sistem dan tidak dapat dihapus secara manual oleh admin.
          </p>
        </div>

        <!-- Kasus Boleh Dihapus: Data Manual Admin -->
        <template v-else>
          <p class="delete-intro">
            Apakah Anda yakin ingin menghapus proyek pengawasan berikut?
          </p>

          <div class="project-preview-box">
            <span class="preview-rup">{{ project?.kode_rup || 'KODE-MANUAL' }}</span>
            <strong class="preview-name">{{ project?.nama }}</strong>
            <span class="preview-dinas">{{ project?.dinas }}</span>
          </div>

          <div class="alert-block alert-block--warning">
            <strong>KONSEKUENSI PENGHAPUSAN:</strong>
            <ul class="consequences-list">
              <li>Seluruh paket tender turunan di bawah proyek ini akan <strong>terhapus permanen</strong>.</li>
              <li>
                Laporan warga yang pernah ditautkan <strong>TIDAK AKAN DIHAPUS</strong>, melainkan tetap tersimpan di arsip pengawasan publik dengan status referensi <code>proyek_id = null</code>.
              </li>
              <li>Tindakan penghapusan dicatat permanen dalam Log Audit Sistem.</li>
            </ul>
          </div>
        </template>

        <div v-if="errorMsg" class="alert-block alert-block--danger">
          <p>{{ errorMsg }}</p>
        </div>
      </div>

      <div class="modal-foot">
        <button class="btn-cancel" :disabled="submitting" @click="close">Batal</button>
        <button
          v-if="project?.asal_data !== 'pemerintah'"
          class="btn-delete"
          :disabled="submitting"
          @click="handleDelete"
        >
          {{ submitting ? 'Menghapus…' : 'Hapus Proyek Permanen' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { adminProjectsApi } from '@/services/api/admin-projects.api'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  project: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'deleted'])

const submitting = ref(false)
const errorMsg = ref('')

function close() {
  emit('update:modelValue', false)
}

async function handleDelete() {
  if (!props.project?.id) return
  submitting.value = true
  errorMsg.value = ''

  try {
    await adminProjectsApi.delete(props.project.id)
    emit('deleted', { id: props.project.id })
    close()
  } catch (err) {
    if (err.response?.status === 403) {
      errorMsg.value = 'Akses ditolak: Data proyek pemerintah dilindungi dari penghapusan manual.'
    } else {
      errorMsg.value = err.message || 'Gagal menghapus proyek.'
    }
    toast.error(errorMsg.value, 'Gagal Menghapus Proyek')
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
  max-width: 520px;
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border-strong, #DCD8D0);
  border-radius: var(--r-lg, 12px);
  overflow: hidden;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--c-border, #E7E3DC);
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}

.text-danger {
  color: var(--c-danger, #D63A1F);
}

.btn-close {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--c-muted, #6B6760);
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-ink, #111111);
}

.delete-intro {
  margin: 0;
}

.project-preview-box {
  padding: 12px;
  background: var(--c-bg, #F4F2EE);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preview-rup {
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  color: var(--c-muted, #6B6760);
}

.preview-name {
  font-size: 13px;
  color: var(--c-ink, #111111);
}

.preview-dinas {
  font-size: 11px;
  color: var(--c-muted, #6B6760);
}

.alert-block {
  padding: 12px;
  border-radius: var(--r-sm, 6px);
  font-size: 11px;
  line-height: 1.45;
}

.alert-block--warning {
  background: var(--c-warning-soft, #FDF0D8);
  border: 1px solid #FCD34D;
  color: #78350F;
}

.alert-block--danger {
  background: var(--c-danger-soft, #FCE4DF);
  border: 1px solid #F5C6CB;
  color: var(--c-danger, #D63A1F);
}

.consequences-list {
  margin: 6px 0 0;
  padding-left: 18px;
}

.consequences-list li {
  margin-bottom: 4px;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--c-border, #E7E3DC);
  background: var(--c-bg-alt, #F8F7F4);
}

.btn-cancel {
  height: 38px;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink, #111111);
  background: var(--c-surface, #FFFFFF);
  border: 1px solid var(--c-border, #E7E3DC);
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

.btn-delete {
  height: 38px;
  padding: 0 18px;
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
  background: var(--c-danger, #D63A1F);
  border: none;
  border-radius: var(--r-sm, 6px);
  cursor: pointer;
}

.btn-delete:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .modal-backdrop {
    padding: 8px;
    align-items: flex-end;
  }
  .modal-card {
    max-width: 100%;
    margin: 0;
    border-radius: 16px 16px 0 0;
    max-height: 90vh;
  }
  .modal-foot {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-cancel,
  .btn-delete {
    width: 100%;
    justify-content: center;
  }
}
</style>
