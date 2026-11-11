import { ref, readonly } from 'vue'

const toasts = ref([])
const timers = new Map()
let seed = 0

function dismiss(id) {
  if (timers.has(id)) {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function show({ type = 'info', title = '', message = '', duration = 4500 } = {}) {
  if (!message && !title) return null

  const id = `toast-${++seed}-${Date.now()}`
  const entry = {
    id,
    type,
    title,
    message,
    duration,
  }

  // Batasi maksimal 5 toast aktif bersamaan agar layar tetap rapi
  if (toasts.value.length >= 5) {
    const oldest = toasts.value[0]
    if (oldest) dismiss(oldest.id)
  }

  toasts.value.push(entry)

  if (duration > 0) {
    const timer = setTimeout(() => {
      dismiss(id)
    }, duration)
    timers.set(id, timer)
  }

  return id
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    show,
    dismiss,
    success(message, title = 'Berhasil', duration = 4500) {
      return show({ type: 'success', title, message, duration })
    },
    error(message, title = 'Gagal Memproses', duration = 6000) {
      return show({ type: 'error', title, message, duration })
    },
    warning(message, title = 'Perhatian', duration = 5000) {
      return show({ type: 'warning', title, message, duration })
    },
    info(message, title = 'Informasi', duration = 4500) {
      return show({ type: 'info', title, message, duration })
    },
  }
}
