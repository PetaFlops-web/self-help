<template>
  <Teleport to="body">
    <Transition name="rm-fade">
      <div
        v-if="modelValue"
        class="rm-backdrop"
        @click.self="close"
      >
        <section
          ref="dialogRef"
          class="rm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rm-title"
          tabindex="-1"
          @keydown.esc.stop="close"
        >
          <header class="rm-head" :style="{ '--c': LEVEL_COLOR[level] }">
            <div class="min-w-0">
              <h3 id="rm-title" class="rm-title">{{ data?.name || 'Laporan warga' }}</h3>
              <p v-if="data?.location" class="rm-sub">{{ data.location }}</p>
              <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
                <RiskBadge :level="level" />
                <span v-if="data?.riskScore != null" class="rm-score">Skor risiko {{ data.riskScore }}/100</span>
              </div>
            </div>
            <button type="button" class="btn-close" aria-label="Tutup" @click="close" />
          </header>

          <div class="rm-body">
            <div v-if="loading" class="d-grid gap-2" aria-busy="true">
              <SkeletonBlock v-for="i in 4" :key="i" width="100%" height="54px" radius="12px" />
            </div>
            <div v-else-if="error" class="alert alert-warning small mb-0" role="alert">{{ error }}</div>
            <p v-else-if="!items.length" class="small text-muted mb-0">
              Belum ada laporan warga untuk proyek ini.
            </p>
            <template v-else>
              <div class="rm-filters" role="group" aria-label="Saring laporan berdasarkan verifikasi">
                <button
                  v-for="f in filters"
                  :key="f.value"
                  type="button"
                  class="rm-chip"
                  :class="{ 'is-active': activeFilter === f.value }"
                  :aria-pressed="activeFilter === f.value"
                  @click="activeFilter = f.value"
                >
                  {{ f.label }} <b>{{ f.count }}</b>
                </button>
              </div>
              <p class="rm-compare-note">
                Bandingkan media laporan yang sudah diverifikasi dengan yang belum.
              </p>

              <ul class="rm-list">
                <li v-for="it in visibleItems" :key="it.code" class="rm-item">
                  <div class="rm-item-head">
                    <span class="rm-dot" :class="`d-${it.level}`" />
                    <div class="flex-grow-1 min-w-0">
                      <b class="d-block rm-code">{{ it.code }}</b>
                      <small class="rm-meta">{{ it.category }} · {{ it.dateLabel }}</small>
                    </div>
                    <RiskBadge :level="it.level" :label="it.status" />
                  </div>
                  <span v-if="!it.verified" class="rm-unverified">Media belum diverifikasi</span>
                  <MediaGallery
                    v-if="it.media && it.media.length"
                    :items="it.media"
                    size="sm"
                    class="rm-media"
                  />
                </li>
              </ul>
            </template>
          </div>

          <footer class="rm-foot">
            <small class="text-muted">
              Menampilkan {{ visibleItems.length }} dari {{ data?.total ?? items.length }} laporan.
              Skor adalah indikator untuk diperiksa, bukan bukti pelanggaran.
            </small>
            <div class="d-flex gap-2">
              <RouterLink v-if="data?.id" class="btn btn-outline-dark btn-sm" :to="{ name: 'project-detail', params: { id: data.id } }" @click="close">
                Profil proyek
              </RouterLink>
              <RouterLink class="btn btn-dark btn-sm" :to="{ name: 'citizen-report' }" @click="close">
                Buat laporan
              </RouterLink>
            </div>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import RiskBadge from '@/components/ui/RiskBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import MediaGallery from '@/components/ui/MediaGallery.vue'
import { LEVEL_COLOR } from '@/config/map'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Hasil toProjectReportsPanel() */
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const dialogRef = ref(null)
const activeFilter = ref('all')
let lastFocused = null

const items = computed(() => props.data?.items ?? [])
const level = computed(() => props.data?.riskLevel ?? 'low')

const verifiedCount = computed(() => items.value.filter((i) => i.verified).length)
const unverifiedCount = computed(() => items.value.length - verifiedCount.value)

const filters = computed(() => [
  { value: 'all', label: 'Semua', count: items.value.length },
  { value: 'verified', label: 'Diverifikasi', count: verifiedCount.value },
  { value: 'unverified', label: 'Belum diverifikasi', count: unverifiedCount.value },
])

const visibleItems = computed(() => {
  if (activeFilter.value === 'verified') return items.value.filter((i) => i.verified)
  if (activeFilter.value === 'unverified') return items.value.filter((i) => !i.verified)
  return items.value
})

function close() {
  emit('update:modelValue', false)
}

// Kunci scroll halaman + kelola fokus saat modal buka/tutup
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      lastFocused = document.activeElement
      activeFilter.value = 'all'
      document.body.style.overflow = 'hidden'
      await nextTick()
      dialogRef.value?.focus()
    } else {
      document.body.style.overflow = ''
      lastFocused?.focus?.()
    }
  },
)
// Jika proyek berganti saat modal terbuka, filter lama tidak relevan
watch(() => props.data?.id, () => { activeFilter.value = 'all' })
</script>

<style scoped>
/* Di atas peta layar penuh (z-index 2000) */
.rm-backdrop {
  position: fixed; inset: 0; z-index: 3000; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(20, 20, 20, 0.55); backdrop-filter: blur(2px);
}
.rm-dialog {
  display: flex; flex-direction: column; width: min(560px, 100%); max-height: min(720px, 100%);
  background: #fff; border-radius: 18px; box-shadow: 0 20px 60px #00000055; outline: none; overflow: hidden;
}
.rm-head {
  display: flex; justify-content: space-between; gap: 12px; padding: 18px 20px 14px;
  border-top: 6px solid var(--c); border-bottom: 1px solid var(--line);
}
.rm-title { margin: 0; font-size: 16px; font-weight: 800; line-height: 1.3; }
.rm-sub { margin: 2px 0 0; font-size: 12px; color: var(--muted); }
.rm-score { font-size: 12px; font-weight: 600; }
.rm-body { flex: 1; min-height: 120px; overflow-y: auto; padding: 14px 20px; }
.rm-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.rm-chip {
  border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 4px 12px;
  font-size: 11px; font-weight: 600; color: var(--muted); cursor: pointer;
}
.rm-chip b { color: #222; margin-left: 4px; }
.rm-chip.is-active { background: #222; border-color: #222; color: #fff; }
.rm-chip.is-active b { color: #fff; }
.rm-compare-note { margin: 0 0 12px; font-size: 11.5px; color: var(--muted); }
.rm-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.rm-item { display: flex; flex-direction: column; gap: 10px; padding: 11px 14px; border: 1px solid var(--line); border-radius: 12px; }
.rm-item-head { display: flex; align-items: center; gap: 12px; }
.rm-unverified {
  align-self: flex-start; padding: 2px 10px; border-radius: 999px;
  background: #fff7e6; color: #b67800; font-size: 10.5px; font-weight: 700;
}
.rm-media { margin-top: 2px; }
.rm-code { font-size: 13px; }
.rm-meta { font-size: 11px; color: var(--muted); }
.rm-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.d-low { background: var(--green); }
.d-attention { background: var(--amber); }
.d-high { background: var(--red); }
.d-info { background: var(--blue); }
.d-progress { background: var(--orange); }
.rm-foot {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: var(--bg-soft);
}
.min-w-0 { min-width: 0; }
.rm-fade-enter-active, .rm-fade-leave-active { transition: opacity .2s ease; }
.rm-fade-enter-from, .rm-fade-leave-to { opacity: 0; }
@media (max-width: 575.98px) {
  .rm-backdrop { align-items: flex-end; padding: 0; }
  .rm-dialog { width: 100%; max-height: 88vh; border-radius: 18px 18px 0 0; }
}
</style>
