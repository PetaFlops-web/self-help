<template>
  <div class="media-gallery">
    <p v-if="!items.length" class="media-empty">{{ emptyText }}</p>
    <ul v-else class="media-grid" :class="`media-grid--${size}`">
      <li v-for="(m, i) in items" :key="m.url + i" class="media-cell">
        <button type="button" class="media-thumb" @click="open(i)">
          <img
            v-if="m.type === 'image'"
            :src="m.url"
            :alt="`Media bukti ${i + 1}`"
            loading="lazy"
          />
          <template v-else>
            <video class="media-video-thumb" :src="m.url" preload="metadata" muted playsinline />
            <span class="media-play-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <polygon points="7,5 19,12 7,19"></polygon>
              </svg>
            </span>
          </template>
          <span class="media-type" :class="`media-type--${m.type}`">
            {{ m.type === 'video' ? 'Video' : 'Foto' }}
          </span>
        </button>
      </li>
    </ul>

    <!-- Lightbox -->
    <Teleport to="body">
      <Transition name="mg-fade">
        <div
          v-if="lightboxIndex !== null"
          class="mg-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau media"
          @click.self="close"
          @keydown.esc="close"
        >
          <button type="button" class="mg-close" aria-label="Tutup" @click="close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button
            v-if="items.length > 1"
            type="button"
            class="mg-nav mg-prev"
            aria-label="Sebelumnya"
            @click.stop="step(-1)"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div class="mg-stage" @click.stop>
            <img
              v-if="current && current.type === 'image'"
              :src="current.url"
              :alt="`Media bukti ${lightboxIndex + 1}`"
            />
            <video
              v-else-if="current"
              :src="current.url"
              controls
              autoplay
              playsinline
              class="mg-video"
            />
          </div>
          <button
            v-if="items.length > 1"
            type="button"
            class="mg-nav mg-next"
            aria-label="Berikutnya"
            @click.stop="step(1)"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <span v-if="items.length > 1" class="mg-counter">{{ lightboxIndex + 1 }} / {{ items.length }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /** Array item { url, type: 'image' | 'video' } dari toMediaItems(). */
  items: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'Belum ada media.' },
  /** Ukuran thumbnail grid: 'sm' | 'md'. */
  size: { type: String, default: 'md' },
})

const lightboxIndex = ref(null)
const current = computed(() =>
  lightboxIndex.value === null ? null : props.items[lightboxIndex.value] ?? null,
)

function open(i) {
  lightboxIndex.value = i
}
function close() {
  lightboxIndex.value = null
}
function step(delta) {
  if (lightboxIndex.value === null || !props.items.length) return
  const n = props.items.length
  lightboxIndex.value = (lightboxIndex.value + delta + n) % n
}

// Kunci scroll halaman saat lightbox terbuka
watch(lightboxIndex, (v) => {
  document.body.style.overflow = v === null ? '' : 'hidden'
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.media-gallery { width: 100%; }
.media-empty { margin: 0; font-size: 12px; color: var(--muted, #6f6f6f); }

.media-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.media-grid--lg {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.media-grid--lg .media-cell {
  flex: 0 0 auto;
  width: 148px;
}
.media-grid--lg .media-thumb {
  aspect-ratio: 1.15 / 1;
  border-radius: 16px;
}
.media-grid--md { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
.media-grid--sm { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); }

.media-cell { margin: 0; }
.media-thumb {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 0;
  border: 1px solid var(--line, #ebe7e2);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(135deg, #e6dcd2 0%, #d7e0d9 100%);
}
.media-thumb img,
.media-video-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.media-play-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1f2937;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  padding-left: 2px;
}
.media-play {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-size: 22px; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.6); pointer-events: none;
}
.media-type {
  position: absolute; left: 8px; bottom: 8px; padding: 2px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 700; color: #fff;
  letter-spacing: 0.02em;
}
.media-type--image { background: rgba(42, 138, 90, 0.9); }
.media-type--video { background: rgba(43, 91, 184, 0.9); }
.media-thumb:focus-visible { outline: 3px solid rgba(255, 106, 43, 0.4); outline-offset: 2px; }

/* Lightbox */
.mg-backdrop {
  position: fixed; inset: 0; z-index: 4000; display: flex; align-items: center; justify-content: center;
  padding: 24px; background: rgba(10, 10, 10, 0.88);
}
.mg-stage { max-width: min(92vw, 1100px); max-height: 86vh; display: flex; }
.mg-stage img, .mg-video { max-width: 100%; max-height: 86vh; border-radius: 10px; object-fit: contain; }
.mg-close {
  position: absolute; top: 16px; right: 20px; width: 44px; height: 44px; border: 0; border-radius: 50%;
  background: rgba(255,255,255,.14); color: #fff; font-size: 26px; line-height: 1; cursor: pointer;
}
.mg-close:hover { background: rgba(255,255,255,.26); }
.mg-nav {
  position: absolute; top: 50%; transform: translateY(-50%); width: 48px; height: 48px; border: 0;
  border-radius: 50%; background: rgba(255,255,255,.14); color: #fff; font-size: 30px; line-height: 1; cursor: pointer;
}
.mg-nav:hover { background: rgba(255,255,255,.26); }
.mg-prev { left: 16px; }
.mg-next { right: 16px; }
.mg-counter {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  color: #fff; font-size: 13px; font-weight: 600; background: rgba(0,0,0,.4); padding: 4px 12px; border-radius: 999px;
}
.mg-fade-enter-active, .mg-fade-leave-active { transition: opacity .2s ease; }
.mg-fade-enter-from, .mg-fade-leave-to { opacity: 0; }

@media (max-width: 575.98px) {
  .mg-nav { width: 40px; height: 40px; font-size: 26px; }
}
@media (prefers-reduced-motion: reduce) {
  .mg-fade-enter-active, .mg-fade-leave-active { transition: none; }
}
</style>
