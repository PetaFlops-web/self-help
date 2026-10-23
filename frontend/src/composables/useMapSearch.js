import { ref } from 'vue'
import { LAMPUNG_BOUNDS } from '@/config/map'

/**
 * Composable untuk pencarian lokasi pada peta Leaflet.
 * Mendukung pencarian lokal pada markers yang ada dan fallback ke Nominatim OSM
 * yang dibatasi dalam viewbox Provinsi Lampung.
 */
export function useMapSearch() {
  const query = ref('')
  const searchMsg = ref('')
  const isSearching = ref(false)

  /**
   * Melakukan pencarian lokasi.
   *
   * @param {Object} params
   * @param {any} params.map - Leaflet map instance
   * @param {Array<Object>} [params.markers=[]] - Daftar marker lokal
   * @param {(lat: number, lng: number, zoom?: number) => void} [params.focusOn] - Handler pemusatan peta
   */
  async function performSearch({ map, markers = [], focusOn }) {
    const q = query.value.trim()
    searchMsg.value = ''
    if (!q || !map) return

    // 1) Cocokkan dengan penanda/proyek lokal terlebih dahulu
    const ql = q.toLowerCase()
    const local = markers.find((m) =>
      (m.keywords || m.title || '').toLowerCase().includes(ql),
    )
    if (local) {
      if (focusOn) focusOn(local.lat, local.lng)
      else map.flyTo([local.lat, local.lng], Math.max(map.getZoom(), 16), { duration: 0.6 })
      return
    }

    // 2) Cari tempat lain melalui Nominatim OSM, dibatasi di dalam batas Provinsi Lampung
    isSearching.value = true
    try {
      const [[s, w], [n, e]] = LAMPUNG_BOUNDS
      const url =
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=id&accept-language=id' +
        `&viewbox=${w},${n},${e},${s}&bounded=1&q=${encodeURIComponent(q)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('gagal')
      const [hit] = await res.json()
      if (!hit) {
        searchMsg.value = 'Lokasi tidak ditemukan di Provinsi Lampung.'
        return
      }

      const [bs, bn, bw, be] = hit.boundingbox.map(Number)
      if (bs === bn && bw === be) {
        if (focusOn) focusOn(Number(hit.lat), Number(hit.lon), 15)
        else map.flyTo([Number(hit.lat), Number(hit.lon)], 15, { duration: 0.6 })
      } else {
        map.flyToBounds(
          [
            [bs, bw],
            [bn, be],
          ],
          { maxZoom: 16, duration: 0.6 },
        )
      }
    } catch {
      searchMsg.value = 'Pencarian gagal. Periksa koneksi internet.'
    } finally {
      isSearching.value = false
    }
  }

  function clearSearch() {
    query.value = ''
    searchMsg.value = ''
  }

  return {
    query,
    searchMsg,
    isSearching,
    performSearch,
    clearSearch,
  }
}
