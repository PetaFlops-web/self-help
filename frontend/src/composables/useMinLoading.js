import { ref, watch, onBeforeUnmount, toValue, getCurrentInstance } from 'vue'
import { SKELETON_MIN_MS } from '@/config/ui'

/**
 * Composable untuk memastikan skeleton UI tampil minimal selama durasi tertentu (SKELETON_MIN_MS),
 * mencegah skeleton berkedip atau hilang terlalu cepat untuk keperluan pengecekan tampilan.
 *
 * @param {import('vue').Ref<boolean> | (() => boolean) | boolean} loadingSource Status loading asli
 * @param {number | { minMs?: number, error?: any, initial?: boolean }} [minMsOrOptions=SKELETON_MIN_MS] Durasi minimum dalam ms atau objek opsi
 * @param {any} [errorSource=null] Status/pesan error asli (jika ada error, skeleton langsung ditutup)
 * @param {boolean} [initialOption] Nilai awal showSkeleton (default: true)
 * @returns {import('vue').Ref<boolean>} Ref boolean showSkeleton
 */
export function useMinLoading(
  loadingSource,
  minMsOrOptions = SKELETON_MIN_MS,
  errorSource = null,
  initialOption = undefined,
) {
  let minMs = SKELETON_MIN_MS
  let errorRef = errorSource
  let initial = initialOption

  if (typeof minMsOrOptions === 'object' && minMsOrOptions !== null) {
    minMs = typeof minMsOrOptions.minMs === 'number' ? minMsOrOptions.minMs : SKELETON_MIN_MS
    errorRef = minMsOrOptions.error ?? errorSource
    if (initial === undefined) {
      initial = minMsOrOptions.initial
    }
  } else if (typeof minMsOrOptions === 'number') {
    minMs = minMsOrOptions
  }

  // Bernilai true sejak komponen dimuat (kecuali diatur eksplisit initial: false)
  const initialValue = initial !== undefined ? Boolean(initial) : true
  const showSkeleton = ref(initialValue)

  let startTime = Date.now()
  let timer = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function checkState() {
    const hasError = Boolean(toValue(errorRef))
    const isLoading = Boolean(toValue(loadingSource))

    // 1. Jika terjadi error, langsung tampilkan pesan error tanpa menunggu
    if (hasError) {
      clearTimer()
      showSkeleton.value = false
      return
    }

    // 2. Jika status loading asli aktif, catat waktu mulai dan tampilkan skeleton
    if (isLoading) {
      clearTimer()
      startTime = Date.now()
      showSkeleton.value = true
      return
    }

    // 3. Loading asli sudah selesai (isLoading === false)
    if (!showSkeleton.value) {
      return
    }

    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, minMs - elapsed)

    // Tidak menambah penundaan jika loading asli sudah lebih lama dari waktu minimum
    if (remaining <= 0) {
      clearTimer()
      showSkeleton.value = false
    } else if (!timer) {
      timer = setTimeout(() => {
        showSkeleton.value = false
        timer = null
      }, remaining)
    }
  }

  // Evaluasi kondisi awal saat composable dipanggil
  if (initialValue && !toValue(loadingSource) && !toValue(errorRef)) {
    if (minMs <= 0) {
      showSkeleton.value = false
    } else {
      timer = setTimeout(() => {
        showSkeleton.value = false
        timer = null
      }, minMs)
    }
  } else if (toValue(errorRef)) {
    showSkeleton.value = false
  }

  // Pantau perubahan status loading dan error
  watch(
    [() => toValue(loadingSource), () => toValue(errorRef)],
    () => {
      checkState()
    },
    { flush: 'sync' },
  )

  // Bersihkan timer saat komponen di-unmount
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      clearTimer()
    })
  }

  return showSkeleton
}
