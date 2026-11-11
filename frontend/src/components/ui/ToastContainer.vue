<template>
  <Teleport to="body">
    <div class="cs-toast-viewport" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="cs-toast">
        <div
          v-for="item in toasts"
          :key="item.id"
          class="cs-toast"
          :class="`cs-toast--${item.type}`"
          :role="item.type === 'error' ? 'alert' : 'status'"
        >
          <span class="cs-toast-icon" aria-hidden="true">
            <!-- Success -->
            <svg v-if="item.type === 'success'" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="10" r="8" />
              <path d="M6.8 10.2l2.2 2.2 4.4-4.6" />
            </svg>
            <!-- Error -->
            <svg v-else-if="item.type === 'error'" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="10" r="8" />
              <path d="M12.5 7.5l-5 5M7.5 7.5l5 5" />
            </svg>
            <!-- Warning -->
            <svg v-else-if="item.type === 'warning'" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 2.8L18 16.5H2L10 2.8z" />
              <path d="M10 8.5v3.5M10 14.2v.01" />
            </svg>
            <!-- Info -->
            <svg v-else viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="10" r="8" />
              <path d="M10 9v4.5M10 6.5v.01" />
            </svg>
          </span>

          <div class="cs-toast-body">
            <p v-if="item.title" class="cs-toast-title">{{ item.title }}</p>
            <p v-if="item.message" class="cs-toast-msg">{{ item.message }}</p>
          </div>

          <button
            type="button"
            class="cs-toast-close"
            aria-label="Tutup notifikasi"
            @click="dismiss(item.id)"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<style scoped>
.cs-toast-viewport {
  position: fixed;
  top: 20px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;
}

.cs-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 14px;
  background: var(--c-surface, #ffffff);
  border: 1.5px solid var(--c-border-strong, #dcd8d0);
  border-left-width: 4px;
  border-radius: var(--r-md, 10px);
  color: var(--c-ink, #111111);
  font-family: var(--font, inherit);
}

.cs-toast--success {
  border-color: var(--c-success, #2e8b57);
  background: #f6fbf8;
}
.cs-toast--success .cs-toast-icon {
  color: var(--c-success, #2e8b57);
}

.cs-toast--error {
  border-color: var(--c-danger, #d63a1f);
  background: #fdf6f5;
}
.cs-toast--error .cs-toast-icon {
  color: var(--c-danger, #d63a1f);
}

.cs-toast--warning {
  border-color: var(--c-warning, #d97706);
  background: #fefaf2;
}
.cs-toast--warning .cs-toast-icon {
  color: var(--c-warning, #d97706);
}

.cs-toast--info {
  border-color: var(--c-info, #2f6fde);
  background: #f5f9fe;
}
.cs-toast--info .cs-toast-icon {
  color: var(--c-info, #2f6fde);
}

.cs-toast-icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  margin-top: 1px;
}

.cs-toast-body {
  flex: 1 1 auto;
  min-width: 0;
}

.cs-toast-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--c-ink, #111111);
}

.cs-toast-msg {
  margin: 3px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--c-muted, #6b6760);
  overflow-wrap: anywhere;
}

.cs-toast-close {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  margin: -2px -4px 0 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--c-muted, #6b6760);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.cs-toast-close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--c-ink, #111111);
}

/* Animasi masuk & keluar */
.cs-toast-enter-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.cs-toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.cs-toast-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.cs-toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
.cs-toast-move {
  transition: transform 0.2s ease;
}

@media (max-width: 575.98px) {
  .cs-toast-viewport {
    top: 12px;
    right: 16px;
    left: 16px;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cs-toast-enter-active,
  .cs-toast-leave-active,
  .cs-toast-move {
    transition: none;
  }
}
</style>
