import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Mendeteksi jenis device pengguna secara reaktif.
 * - isMobile : lebar layar < 768px
 * - isTablet : lebar layar 768-991px
 * - isTouch  : perangkat utama berupa layar sentuh
 */
export function useDevice() {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isTouch = ref(false)

  const mqMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767.98px)') : null
  const mqTablet = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px) and (max-width: 991.98px)') : null
  const mqTouch = typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)') : null

  const update = () => {
    isMobile.value = !!mqMobile?.matches
    isTablet.value = !!mqTablet?.matches
    isTouch.value = !!mqTouch?.matches
  }

  onMounted(() => {
    update()
    ;[mqMobile, mqTablet, mqTouch].forEach((mq) => mq?.addEventListener('change', update))
  })
  onBeforeUnmount(() => {
    ;[mqMobile, mqTablet, mqTouch].forEach((mq) => mq?.removeEventListener('change', update))
  })

  return { isMobile, isTablet, isTouch }
}
