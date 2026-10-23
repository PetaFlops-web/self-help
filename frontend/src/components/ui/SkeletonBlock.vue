<template>
  <div
    class="skeleton-shimmer skeleton-block"
    :class="`tone-${tone}`"
    :style="computedStyles"
    aria-hidden="true"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  width: {
    type: [String, Number],
    default: '100%',
  },
  height: {
    type: [String, Number],
    default: '20px',
  },
  radius: {
    type: String,
    default: 'var(--radius-sm)',
  },
  circle: {
    type: Boolean,
    default: false,
  },
  tone: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'light'].includes(v),
  },
})

const computedStyles = computed(() => {
  const w = typeof props.width === 'number' ? `${props.width}px` : props.width
  const h = typeof props.height === 'number' ? `${props.height}px` : props.height
  return {
    width: w,
    height: h,
    borderRadius: props.circle ? '50%' : props.radius,
  }
})
</script>

<style scoped>
.skeleton-block {
  display: block;
  flex-shrink: 0;
}

.skeleton-shimmer {
  position: relative;
  overflow: hidden;
  background-color: var(--line);
}

.skeleton-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.45) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.8s ease-in-out infinite;
}

.skeleton-shimmer.tone-light {
  background-color: #ffffff40;
}

.skeleton-shimmer.tone-light::after {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    #ffffff66 50%,
    rgba(255, 255, 255, 0) 100%
  );
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer::after {
    animation: none;
    display: none;
  }
}
</style>
