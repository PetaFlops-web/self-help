<template>
  <div class="map-slot">
    <div
      class="map"
      :class="{ 'map--full': expanded }"
      role="region"
      aria-label="Peta Provinsi Lampung"
    >
      <LMap
        ref="mapRef"
        class="lf-map"
        :class="{ 'is-sat': currentMode === 'satelit' }"
        :zoom="zoom"
        :center="center"
        :min-zoom="minZoom"
        :max-bounds="maxBounds"
        :use-global-leaflet="false"
        :options="{ zoomControl: false, maxBoundsViscosity: 1.0 }"
        @ready="onMapReady"
      >
        <LTileLayer
          :key="`${currentMode}-${tileKey}`"
          :url="TILES[currentMode].url"
          :attribution="TILES[currentMode].attribution"
          :max-zoom="TILES[currentMode].maxZoom"
          layer-type="base"
          name="Dasar"
          @load="onTileLoaded"
          @tileerror="onTileError"
        />
        <LTileLayer
          v-if="currentMode === 'satelit'"
          :key="`labels-${tileKey}`"
          :url="LABELS.url"
          :attribution="LABELS.attribution"
          :max-zoom="LABELS.maxZoom"
          layer-type="overlay"
          name="Label"
        />
        <LMarker
          v-for="m in markers"
          :key="m.key"
          :lat-lng="[m.lat, m.lng]"
          :icon="m.icon"
          :options="{ alt: m.title, zIndexOffset: m.z }"
          @click="handleMarkerClick(m)"
          @ready="(mk) => bindTip(mk, m)"
        />
      </LMap>

      <!-- Skeleton shimmer overlay sampai Leaflet ready dan tile pertama termuat -->
      <Transition name="fade">
        <div v-if="showSkeleton" class="map-loading-overlay" aria-busy="true">
          <span class="visually-hidden" role="status">Memuat peta…</span>
          <div class="skeleton-shimmer w-100 h-100" aria-hidden="true" />
        </div>
      </Transition>

      <!-- Pesan jika tile gagal dimuat -->
      <div
        v-if="tileError"
        class="map-error-overlay d-flex flex-column align-items-center justify-content-center p-3 text-center"
        role="alert"
      >
        <p class="small text-danger fw-bold mb-2">Peta gagal dimuat</p>
        <button type="button" class="btn btn-dark btn-sm" @click="retryTiles">Coba lagi</button>
      </div>

      <input
        v-model="query"
        class="form-control bg-white rounded-pill search"
        type="search"
        placeholder="Cari lokasi atau proyek"
        aria-label="Cari lokasi atau proyek"
        @keyup.enter="handleSearch"
      />

      <div class="toggle d-flex bg-white border rounded-pill p-1" role="group" aria-label="Mode peta">
        <button
          type="button"
          class="btn btn-sm"
          :class="currentMode === 'peta' ? 'btn-red' : 'btn-link text-secondary'"
          @click="setMode('peta')"
        >
          Peta
        </button>
        <button
          type="button"
          class="btn btn-sm"
          :class="currentMode === 'satelit' ? 'btn-red' : 'btn-link text-secondary'"
          @click="setMode('satelit')"
        >
          Satelit
        </button>
      </div>

      <p v-if="searchMsg" class="search-msg badge rounded-pill" role="status">
        {{ searchMsg }}
      </p>

      <ul class="legend" aria-label="Keterangan warna pin">
        <li><i :style="{ background: LEVEL_COLOR.high }" />Risiko tinggi</li>
        <li><i :style="{ background: LEVEL_COLOR.attention }" />Perlu perhatian</li>
        <li><i :style="{ background: LEVEL_COLOR.low }" />Risiko rendah</li>
      </ul>

      <div class="zoom btn-group-vertical shadow-sm">
        <button type="button" class="btn btn-light btn-sm" aria-label="Perbesar" @click="zoomBy(1)">+</button>
        <button type="button" class="btn btn-light btn-sm" aria-label="Perkecil" @click="zoomBy(-1)">−</button>
      </div>

      <button
        v-if="expanded"
        type="button"
        class="btn btn-dark btn-sm close-full"
        @click="handleCollapse"
      >
        ✕ Tutup peta besar
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import 'leaflet/dist/leaflet.css'
import '@/assets/styles/map.css'
import { LMap, LMarker, LTileLayer } from '@vue-leaflet/vue-leaflet'
import { LAMPUNG_BOUNDS, MIN_ZOOM, START_ZOOM, TILES, LABELS, LEVEL_COLOR } from '@/config/map'
import { escapeHtml } from '@/utils/formatters'
import { useMinLoading } from '@/composables/useMinLoading'
import { useMapSearch } from '@/composables/useMapSearch'
import { useMapFullscreen } from '@/composables/useMapFullscreen'

const props = defineProps({
  markers: {
    type: Array,
    default: () => [],
  },
  center: {
    type: Array,
    default: () => [-5.2167, 105.1833],
  },
  zoom: {
    type: Number,
    default: START_ZOOM,
  },
  minZoom: {
    type: Number,
    default: MIN_ZOOM,
  },
  maxBounds: {
    type: Array,
    default: () => LAMPUNG_BOUNDS,
  },
  mode: {
    type: String,
    default: 'peta',
    validator: (v) => ['peta', 'satelit'].includes(v),
  },
})

const emit = defineEmits(['marker-click', 'update:mode', 'expand', 'collapse'])

const mapRef = ref(null)
const currentMode = ref(props.mode)
const isMapLoading = ref(true)
const tileError = ref(false)
const showSkeleton = useMinLoading(isMapLoading, { error: tileError })
const tileKey = ref(0)

function onMapReady() {
  // Instance Leaflet sudah siap di DOM
}

function onTileLoaded() {
  isMapLoading.value = false
  tileError.value = false
}

function onTileError() {
  tileError.value = true
  isMapLoading.value = false
}

function retryTiles() {
  tileError.value = false
  isMapLoading.value = true
  tileKey.value++
}

watch(
  () => props.mode,
  (val) => {
    if (val && val !== currentMode.value) {
      currentMode.value = val
      isMapLoading.value = true
    }
  },
)

function setMode(newMode) {
  if (currentMode.value !== newMode) {
    currentMode.value = newMode
    isMapLoading.value = true
    emit('update:mode', newMode)
  }
}

const { query, searchMsg, performSearch } = useMapSearch()
const { expanded, expand: expandFullscreen, collapse: collapseFullscreen, setCustomCollapseHandler } = useMapFullscreen()

const leaflet = () => mapRef.value?.leafletObject

function focusOn(lat, lng, zoomLevel = 16) {
  const map = leaflet()
  if (!map) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  map.flyTo([lat, lng], Math.max(map.getZoom(), zoomLevel), { duration: 0.6, animate: !reduce })
}

function zoomBy(step) {
  const map = leaflet()
  if (map) (step > 0 ? map.zoomIn() : map.zoomOut())
}

function handleSearch() {
  performSearch({
    map: leaflet(),
    markers: props.markers,
    focusOn,
  })
}

// Tooltip hover memakai bindTooltip bawaan Leaflet (stabil untuk banyak marker).
// Marker disimpan per key agar isi tooltip ikut diperbarui saat data dari API tiba.
const leafletMarkers = new Map()

function tipHtml(t) {
  const color = LEVEL_COLOR[t.level] || '#999'
  return (
    `<div class="risk-tip" style="--c:${color}">` +
    `<b class="risk-tip__title">${escapeHtml(t.title)}</b>` +
    (t.subtitle ? `<span class="risk-tip__sub">${escapeHtml(t.subtitle)}</span>` : '') +
    `<span class="risk-tip__row"><span class="risk-tip__badge">${escapeHtml(t.label)}</span>` +
    (t.score != null ? `<span class="risk-tip__score">Skor ${escapeHtml(t.score)}/100</span>` : '') +
    `</span><span class="risk-tip__hint">Klik untuk melihat laporan warga</span></div>`
  )
}

function applyTip(marker, m) {
  if (!m.tip || !marker?.bindTooltip) return
  marker.unbindTooltip()
  marker.bindTooltip(tipHtml(m.tip), { direction: 'top', offset: [0, -4], opacity: 1, className: 'risk-tip-wrap' })
}

function bindTip(marker, m) {
  leafletMarkers.set(m.key, marker)
  applyTip(marker, m)
}

watch(
  () => props.markers,
  (list) => {
    for (const m of list) {
      const mk = leafletMarkers.get(m.key)
      if (mk) applyTip(mk, m)
    }
  },
)

// vue-leaflet memasang listener sekali saat marker dibuat, jadi `m` dari template bisa basi
// (mis. pin proyek utama dibuat sebelum data API tiba). Selalu cari data terbaru lewat key.
function handleMarkerClick(stale) {
  const m = props.markers.find((x) => x.key === stale.key) ?? stale
  focusOn(m.lat, m.lng)
  emit('marker-click', m)
}

function refreshSize(fit) {
  const map = leaflet()
  if (!map) return
  map.invalidateSize()
  if (fit && props.markers.length > 0) {
    map.fitBounds(
      props.markers.map((m) => [m.lat, m.lng]),
      { padding: [90, 90], maxZoom: 15 },
    )
  }
}

function handleExpand() {
  expandFullscreen({
    getMap: leaflet,
    markers: props.markers,
  })
  emit('expand')
}

function handleCollapse() {
  collapseFullscreen({
    getMap: leaflet,
    resetCenter: props.center,
    resetZoom: props.zoom,
  })
  emit('collapse')
}

// Handler escape key
setCustomCollapseHandler(handleCollapse)

defineExpose({
  mapRef,
  leaflet,
  focusOn,
  zoomBy,
  refreshSize,
  expand: handleExpand,
  collapse: handleCollapse,
  expanded,
})
</script>

<style scoped>
.map-slot { position: relative; min-height: 300px; height: 100%; }
.map {
  position: absolute; inset: 0; overflow: hidden;
  background: var(--bg-outer); border: 1px solid var(--line); border-radius: var(--radius-md);
}
.map-loading-overlay {
  position: absolute; inset: 0; z-index: 500; pointer-events: none;
}
.map-error-overlay {
  position: absolute; inset: 0; z-index: 500;
  background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(4px);
}
.fade-enter-active, .fade-leave-active { transition: opacity .25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.skeleton-shimmer {
  position: relative; overflow: hidden; background-color: var(--line);
}
.skeleton-shimmer::after {
  content: ''; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%);
  animation: shimmer 1.8s ease-in-out infinite;
}
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) { .skeleton-shimmer::after { animation: none; display: none; } }

/* z-index 0 membuat lapisan Leaflet terkurung di dalam peta */
.map--full { position: fixed; inset: 0; z-index: 2000; border: 0; border-radius: 0; }
.map--full .search { top: 20px; left: 20px; width: min(340px, 55%); }
.map--full .toggle { top: 20px; right: 20px; }
.map--full .zoom { right: 20px; bottom: calc(36px + env(safe-area-inset-bottom)); }
.close-full { position: absolute; z-index: 1000; left: 20px; bottom: calc(28px + env(safe-area-inset-bottom)); --bs-btn-padding-x: 18px; --bs-btn-padding-y: 9px; --bs-btn-font-size: 12px; }
.lf-map { position: absolute; inset: 0; z-index: 0; font-family: var(--font); }
.search { position: absolute; z-index: 1000; top: 12px; left: 12px; width: min(250px, 50%); font-size: 12px; padding: 11px 20px; }
.toggle { position: absolute; z-index: 1000; top: 12px; right: 12px; }
.toggle .btn { --bs-btn-padding-x: 16px; --bs-btn-padding-y: 6px; --bs-btn-font-size: 11px; text-decoration: none; }

.zoom { position: absolute; z-index: 1000; right: 8px; bottom: 28px; }
.zoom .btn { --bs-btn-padding-x: 0; --bs-btn-padding-y: 0; width: 34px; height: 34px; font-size: 17px; font-weight: 700; }
.search-msg {
  position: absolute; z-index: 1000; top: 62px; left: 12px; background: #fff; color: var(--red);
  border: 1px solid #f0c9c2; padding: 7px 14px; font-size: 11px; font-weight: 700; margin: 0;
}

.legend {
  position: absolute; z-index: 1000; left: 12px; bottom: 28px; margin: 0; padding: 8px 12px;
  list-style: none; display: grid; gap: 4px; font-size: 11px; font-weight: 600;
  background: rgba(255, 255, 255, 0.94); border: 1px solid var(--line); border-radius: 12px;
}
.legend li { display: flex; align-items: center; gap: 8px; }
.legend i { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.map--full .legend { left: 20px; bottom: calc(76px + env(safe-area-inset-bottom)); }

/* HP: kolom pencarian lebih lebar, kontrol lebih besar */
@media (max-width: 575.98px) {
  .search { width: calc(100% - 140px); }
  .map--full .search { width: calc(100% - 150px); top: calc(12px + env(safe-area-inset-top)); }
  .map--full .toggle { top: calc(12px + env(safe-area-inset-top)); right: 12px; }
}
@media (pointer: coarse) {
  .zoom .btn { width: 40px; height: 40px; }
}
</style>
