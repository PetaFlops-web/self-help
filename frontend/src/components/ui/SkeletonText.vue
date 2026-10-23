<template>
  <div class="skeleton-text-group d-grid" :style="{ gap: computedGap }" aria-hidden="true">
    <div
      v-for="i in lines"
      :key="i"
      class="skeleton-shimmer skeleton-text-line"
      :style="{
        height: computedLineHeight,
        width: i === lines ? lastLineWidth : '100%',
        borderRadius: radius,
      }"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  lines: {
    type: Number,
    default: 3,
  },
  lineHeight: {
    type: [String, Number],
    default: '14px',
  },
  gap: {
    type: [String, Number],
    default: '10px',
  },
  lastLineWidth: {
    type: String,
    default: '60%',
  },
  radius: {
    type: String,
    default: '999px',
  },
})

const computedLineHeight = computed(() =>
  typeof props.lineHeight === 'number' ? `${props.lineHeight}px` : props.lineHeight,
)
const computedGap = computed(() =>
  typeof props.gap === 'number' ? `${props.gap}px` : props.gap,
)
</script>

<style scoped>
.skeleton-text-line {
  display: block;
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
