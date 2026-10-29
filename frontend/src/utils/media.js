import { mediaUrl } from '@/config/api'

/** Ekstensi yang diperlakukan sebagai video. */
const VIDEO_EXT = ['mp4', 'webm', 'mov', 'ogg']

/**
 * Mengubah satu path media backend menjadi item galeri { url, type }.
 * @param {string} path
 * @returns {{ url: string, type: 'image' | 'video' }}
 */
export function toMediaItem(path) {
  const url = mediaUrl(path)
  const ext = (url.split('.').pop() || '').toLowerCase().split(/[?#]/)[0]
  return { url, type: VIDEO_EXT.includes(ext) ? 'video' : 'image' }
}

/**
 * Mengubah daftar path media (foto_urls) menjadi array item galeri.
 * Item dengan URL kosong dibuang.
 * @param {Array<string> | null | undefined} list
 * @returns {Array<{ url: string, type: 'image' | 'video' }>}
 */
export function toMediaItems(list) {
  return (Array.isArray(list) ? list : []).map(toMediaItem).filter((m) => m.url)
}
