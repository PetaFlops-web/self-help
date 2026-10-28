import { divIcon } from 'leaflet'
import { markRaw } from 'vue'
import { escapeHtml } from '@/utils/formatters'

/**
 * Membuat custom divIcon SVG untuk penanda Leaflet dengan efek halo.
 *
 * @param {string} color - Warna utama pin (hex)
 * @param {Object} [options]
 * @param {boolean} [options.main=false] - True jika pin utama (ukuran lebih besar)
 * @param {string} [options.label=''] - Teks label tooltip di atas pin
 * @returns {import('leaflet').DivIcon}
 */
export function pinIcon(color, { main = false, label = '' } = {}) {
  const w = main ? 40 : 36
  const h = main ? 50 : 44
  const tip = label ? `<span class="gm-pin__tip">${escapeHtml(label)}</span>` : ''


  return markRaw(
    divIcon({
      className: 'lf-pin',
      iconSize: [w, h],
      iconAnchor: [w / 2, h], // Ujung bawah pin tepat berada di titik koordinat
      tooltipAnchor: [0, -h], // Tooltip hover muncul tepat di atas kepala pin
      html:
        `<div class="gm-pin${main ? ' gm-pin--main' : ''}">` +
        `<span class="gm-pin__halo" style="--c:${color};--halo:${color}2b;--halo-sat:${color}80"></span>` +
        `<svg viewBox="-18 -40 36 44" aria-hidden="true"><path d="M0 0C-9-12-17-20-17-29a17 17 0 1 1 34 0C17-20 9-12 0 0z" fill="${color}" /><circle cy="-29" r="7" fill="#fff" /></svg>` +
        `${tip}</div>`,
    }),
  )
}
