/**
 * Konfigurasi batas wilayah, zoom, tile layers, dan warna penanda Leaflet untuk Provinsi Lampung.
 */

// Batas Provinsi Lampung (termasuk pulau-pulau kecil): [[selatan, barat], [utara, timur]].
// Peta tidak bisa digeser keluar dari kotak ini.
export const LAMPUNG_BOUNDS = [
  [-6.2, 103.6],
  [-3.7, 106.3],
]

export const MIN_ZOOM = 8 // zoom terjauh: seluruh provinsi Lampung
export const START_ZOOM = 14 // tampilan awal: sekitar proyek

export const TILES = {
  peta: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; kontributor <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satelit: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
}

export const LABELS = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  attribution: '',
  maxZoom: 18,
}

export const LEVEL_COLOR = {
  low: '#2a8a5a',
  attention: '#f0a31a',
  high: '#ff6a2b',
}

export const PROJECT_COLOR = '#d6341e'
