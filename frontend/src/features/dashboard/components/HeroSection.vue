<template>
  <section class="hero">
    <div class="d-flex justify-content-center flex-wrap gap-2">
      <span v-for="t in project.tags" :key="t" class="badge rounded-pill chip">{{ t }}</span>
    </div>
    <h1 class="hero-title" v-html="project.titleHtml || project.title" />
    

    <div class="banner-wrap">
      <div class="cta-float">
        <RouterLink class="btn btn-outline-orange btn-sm" to="/lapor">Lapor warga</RouterLink>
      </div>
      <div class="banner" :aria-busy="showSkeleton">
        <span class="b-chip b-left badge rounded-pill">
          <span class="coins"><i /><i /></span>
          <span class="b-chip-text b-chip-budget">
            <Transition name="fade-fast" mode="out-in">
              <SkeletonBlock v-if="showSkeleton" tone="light" width="110px" height="13px" radius="4px" />
              <span v-else key="content">{{ project.budgetLabel || '–' }}</span>
            </Transition>
          </span>
        </span>
        

        <svg class="scene" viewBox="0 0 1026 312" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
          <defs>
            <symbol id="pin" viewBox="-18 -40 36 44" overflow="visible">
              <path d="M0 0C-9-12-17-20-17-29a17 17 0 1 1 34 0C17-20 9-12 0 0z" fill="#fff" />
              <circle cx="0" cy="-29" r="7" fill="#e8441e" />
            </symbol>
          </defs>

          <circle cx="607" cy="215" r="150" fill="#fff" opacity=".1" />
          <circle cx="607" cy="215" r="88" fill="#fff" opacity=".12" />
          <path d="M520 340C540 262 622 252 662 202C712 140 716 78 800 10" fill="none" stroke="#5d1618" stroke-opacity=".35" stroke-width="84" stroke-linecap="round" />
          <path d="M520 340C540 262 622 252 662 202C712 140 716 78 800 10" fill="none" stroke="#7a1f21" stroke-width="68" stroke-linecap="round" />
          <path class="road-dash" d="M520 340C540 262 622 252 662 202C712 140 716 78 800 10" fill="none" stroke="#f7c6b4" stroke-width="3" stroke-dasharray="16 16" stroke-linecap="round" />

          <!-- Pin dengan efek radar + kemunculan berjeda (dari jauh/kecil ke dekat/besar) -->
          <g class="pin-group pin-1">
            <circle class="radar" cx="702" cy="131" r="12" fill="none" stroke="#fff" stroke-width="2.5" />
            <use href="#pin" x="687" y="112" width="30" height="38" />
          </g>
          <g class="pin-group pin-2">
            <circle class="radar" cx="718" cy="189" r="12" fill="none" stroke="#fff" stroke-width="2.5" />
            <use href="#pin" x="703" y="170" width="30" height="38" />
          </g>
          <g class="pin-group pin-3">
            <circle class="radar" cx="627" cy="204" r="16" fill="none" stroke="#fff" stroke-width="3" />
            <use href="#pin" x="606" y="178" width="42" height="52" />
          </g>
          <g class="pin-group pin-4">
            <circle class="radar" cx="571" cy="251" r="12" fill="none" stroke="#fff" stroke-width="2.5" />
            <use href="#pin" x="556" y="232" width="30" height="38" />
          </g>
        </svg>

        <div
          class="gauge"
          role="img"
          :aria-label="showSkeleton ? 'Skor risiko' : `Skor risiko ${project.riskScore ?? '–'}, ${project.riskLabel || '–'}`"
        >
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <circle cx="80" cy="80" r="78" fill="#8c2320" opacity=".92" />
            <circle cx="80" cy="80" r="62" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="9" />
            <circle
              class="gauge-arc"
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke="#fff"
              stroke-width="9"
              stroke-linecap="round"
              :stroke-dasharray="`${showSkeleton ? 0 : gaugeFill} ${circ}`"
              transform="rotate(-90 80 80)"
            />
          </svg>
          <div class="gauge-text">
            <small>Skor risiko</small>
            <div class="gauge-dynamic-slot">
              <Transition name="fade-fast" mode="out-in">
                <div v-if="showSkeleton" key="skeleton" class="gauge-skeleton">
                  <SkeletonBlock tone="light" width="70px" height="46px" radius="10px" class="gauge-sk-score" />
                  <SkeletonBlock tone="light" width="50px" height="13px" radius="4px" class="gauge-sk-label" />
                </div>
                <div v-else key="content" class="gauge-content">
                  <strong>{{ project.riskScore ?? '–' }}</strong>
                  <span>{{ project.riskLabel || '–' }}</span>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <p class="disclaimer badge rounded-pill text-start">{{ project.disclaimer }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import { useMinLoading } from '@/composables/useMinLoading'
import { useDashboardData } from '../composables/useDashboardData'

const { project, loading } = useDashboardData()
const showSkeleton = useMinLoading(loading)
const circ = 2 * Math.PI * 62
// Panjang busur mengikuti skor risiko (0–100), bukan angka tetap.
const gaugeFill = computed(() => {
  const score = Math.max(0, Math.min(100, Number(project.riskScore) || 0))
  return circ * (score / 100)
})
</script>

<style scoped>
.hero { text-align: center; padding-top: 18px; }
.hero :deep(.chip) { padding: 8px 18px; }
.hero-title {
  font-size: clamp(30px, 6.2vw, 68px); line-height: 1.04; font-weight: 800;
  letter-spacing: -0.035em; margin-top: 26px;
}
.hero-title :deep(em) { font-style: normal; color: var(--red); }


.banner-wrap { position: relative; margin-top: 44px; }
.banner {
  position: relative; height: 312px; border-radius: var(--radius-lg); overflow: hidden;
  /* Oranye solid (tanpa gradient), sama dengan kartu tiket di halaman Lacak Laporan */
  background: var(--orange, #ff6a2b);
  text-align: left; color: #fff;
}
.banner::before { /* grid titik di kanan atas */
  content: ''; position: absolute; top: 0; right: 0; width: 46%; height: 55%;
  background: radial-gradient(circle, #ffffff55 1.4px, transparent 1.6px) 0 0 / 22px 22px;
  -webkit-mask-image: linear-gradient(to left, #000 20%, transparent);
  mask-image: linear-gradient(to left, #000 20%, transparent);
}
.cta-float {
  position: absolute; z-index: 5; left: 50%; top: 0; transform: translate(-50%, -50%);
  display: flex; gap: 10px;
}
.cta-float .btn { white-space: nowrap; --bs-btn-padding-x: 18px; --bs-btn-padding-y: 10px; --bs-btn-font-size: 12px; }

.b-chip {
  position: absolute; top: 20px; z-index: 2; display: inline-flex; align-items: center; gap: 8px;
  background: #ffffff30; border-radius: 999px; padding: 7px 14px; font-size: 11px; font-weight: 700;
  backdrop-filter: blur(4px);
}
.b-chip-text {
  display: inline-flex;
  align-items: center;
}
.b-chip-budget {
  min-width: 110px;
}
.b-chip-reports {
  min-width: 100px;
}
.b-left { left: 22px; padding-left: 8px; }
.b-right { right: 22px; }
.coins { display: inline-flex; }
.coins i { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid #ff9a52; }
.coins i + i { background: #ffb43a; margin-left: -7px; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: var(--amber); }

.scene { position: absolute; inset: 0; width: 100%; height: 100%; }

/* Garis tengah jalan mengalir maju (efek berjalan) */
.road-dash { animation: road-flow 1.1s linear infinite; }
@keyframes road-flow { to { stroke-dashoffset: -32; } }

/* Pin muncul berurutan dengan jeda, lalu berulang */
.pin-group {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: pin-pop 5.6s ease-in-out infinite;
  opacity: 0;
}
.pin-1 { animation-delay: 0s; }
.pin-2 { animation-delay: 1.1s; }
.pin-3 { animation-delay: 2.2s; }
.pin-4 { animation-delay: 3.3s; }
@keyframes pin-pop {
  0%        { opacity: 0; transform: translateY(10px) scale(0.3); }
  8%        { opacity: 1; transform: translateY(-3px) scale(1.08); }
  12%       { transform: translateY(0) scale(1); }
  70%       { opacity: 1; transform: translateY(0) scale(1); }
  82%, 100% { opacity: 0; transform: translateY(0) scale(0.9); }
}

/* Cincin radar memuai & memudar di tiap pin */
.radar {
  transform-box: fill-box;
  transform-origin: center;
  animation: radar-pulse 1.8s ease-out infinite;
}
.pin-1 .radar { animation-delay: 0.3s; }
.pin-2 .radar { animation-delay: 1.4s; }
.pin-3 .radar { animation-delay: 2.5s; }
.pin-4 .radar { animation-delay: 3.6s; }
@keyframes radar-pulse {
  0%   { transform: scale(0.4); opacity: 0.7; }
  100% { transform: scale(2.6); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .road-dash, .pin-group, .radar { animation: none; }
  .pin-group { opacity: 1; }
  .radar { opacity: 0; }
}
.gauge { position: absolute; z-index: 2; right: 56px; top: 50%; transform: translateY(-46%); width: 164px; height: 164px; }
.gauge svg { width: 100%; height: 100%; display: block; }
.gauge-arc {
  transition: stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.gauge-text { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.1; }
.gauge-text small { font-size: 11px; opacity: .85; }
.gauge-dynamic-slot {
  min-height: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.gauge-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.gauge-sk-score {
  margin: 2px 0;
}
.gauge-sk-label {
  margin-top: 2px;
}
.gauge-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.gauge-content strong {
  font-size: 46px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 2px 0;
  line-height: 1.1;
}
.gauge-content span {
  font-size: 12px;
  font-weight: 600;
}
.disclaimer {
  position: absolute; z-index: 2; left: 20px; bottom: 16px; max-width: min(640px, calc(100% - 40px));
  white-space: normal; background: #7a1f2199; border-radius: 999px; padding: 9px 18px; font-size: 11px; font-weight: 600; line-height: 1.4; width: max-content;
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .gauge-arc {
    transition: none !important;
  }
  .fade-fast-enter-active,
  .fade-fast-leave-active {
    transition: none !important;
  }
}

@media (max-width: 900px) {
  .banner { height: 380px; }
  .gauge { right: 50%; transform: translate(50%, -60%); top: 46%; }
  .b-chip { top: 24px; }
  .b-right { top: 66px; right: auto; left: 22px; }
  .scene { opacity: .4; }
  .disclaimer { border-radius: 16px; }
}
</style>