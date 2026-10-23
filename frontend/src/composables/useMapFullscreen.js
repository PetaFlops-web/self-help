import { nextTick, onBeforeUnmount, ref } from 'vue'

/**
 * Composable untuk mengelola mode layar penuh (fullscreen) peta.
 * Menangani penguncian scroll pada body, listener tombol Escape,
 * serta pemanggilan invalidateSize pada instance Leaflet.
 */
export function useMapFullscreen() {
  const expanded = ref(false)

  let activeCollapseHandler = null

  function onKey(e) {
    if (e.key === 'Escape') {
      if (activeCollapseHandler) {
        activeCollapseHandler()
      } else {
        collapse()
      }
    }
  }

  /**
   * Membuka peta dalam mode layar penuh.
   *
   * @param {Object} [options]
   * @param {() => any} [options.getMap] - Fungsi pengambil instance Leaflet map
   * @param {Array<{ lat: number, lng: number }>} [options.markers] - Marker untuk auto fitBounds
   * @param {() => void} [options.onAfterExpand] - Callback tambahan setelah expand
   */
  async function expand(options = {}) {
    const { getMap, markers, onAfterExpand } = options
    expanded.value = true
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)

    await nextTick()
    const map = getMap?.()
    if (map) {
      map.invalidateSize()
      if (markers && markers.length > 0) {
        map.fitBounds(
          markers.map((m) => [m.lat, m.lng]),
          { padding: [90, 90], maxZoom: 15 },
        )
      }
    }

    if (onAfterExpand) onAfterExpand()
  }

  /**
   * Menutup mode layar penuh dan mengembalikan peta ke ukuran normal.
   *
   * @param {Object} [options]
   * @param {() => any} [options.getMap] - Fungsi pengambil instance Leaflet map
   * @param {[number, number]} [options.resetCenter] - Koordinat pemusatan ulang [lat, lng]
   * @param {number} [options.resetZoom] - Level zoom saat reset
   * @param {() => void} [options.onAfterCollapse] - Callback tambahan setelah collapse
   */
  async function collapse(options = {}) {
    const { getMap, resetCenter, resetZoom, onAfterCollapse } = options
    expanded.value = false
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKey)

    await nextTick()
    const map = getMap?.()
    if (map) {
      map.invalidateSize()
      if (resetCenter) {
        map.setView(resetCenter, resetZoom || map.getZoom())
      }
    }

    if (onAfterCollapse) onAfterCollapse()
  }

  /**
   * Mendaftarkan custom collapse handler yang akan dipanggil saat tombol Escape ditekan.
   * @param {() => void} handler
   */
  function setCustomCollapseHandler(handler) {
    activeCollapseHandler = handler
  }

  onBeforeUnmount(() => {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKey)
  })

  return {
    expanded,
    expand,
    collapse,
    setCustomCollapseHandler,
  }
}
