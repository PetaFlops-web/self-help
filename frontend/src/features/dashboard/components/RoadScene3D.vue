<template>
  <div ref="host" class="road3d" aria-hidden="true" />
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'

const host = ref(null)

// State Three.js disimpan di variabel biasa (bukan ref) — objek Three.js tidak boleh
// dibungkus proxy reaktif Vue. Hanya UI primitif yang reaktif.
let renderer, scene, camera, clock, ro, raf = null
let roadTexture = null
let pins = []
const disposables = []

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Geometri & material dibagi antar pin (hemat memori; di-dispose sekali di teardown).
let sharedPinGeo, sharedHeadGeo, sharedRadarGeo, sharedPinMat, sharedHeadMat

const ROAD_LEN = 70        // panjang jalan ke kedalaman
const SPAWN_Z = -58        // titik jauh tempat pin "muncul"
const DESPAWN_Z = 9        // melewati kamera → daur ulang
const SPEED = 14           // kecepatan jalan bergerak maju (unit/detik)
const SPAWN_INTERVAL = 1.1 // jeda antar kemunculan pin (detik)

function makeRoadTexture() {
  // Tekstur jalan prosedural: aspal gelap + garis putus-putus tengah.
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#7a1f21'            // aspal (nuansa merah-oranye gelap, selaras banner)
  ctx.fillRect(0, 0, c.width, c.height)
  // tepi jalan
  ctx.fillStyle = '#f7c6b4'
  ctx.globalAlpha = 0.5
  ctx.fillRect(10, 0, 4, c.height)
  ctx.fillRect(c.width - 14, 0, 4, c.height)
  ctx.globalAlpha = 1
  // garis putus tengah
  ctx.fillStyle = '#ffd9c2'
  const dashH = 56, gap = 48, x = c.width / 2 - 4
  for (let y = 0; y < c.height; y += dashH + gap) ctx.fillRect(x, y, 8, dashH)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 6)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makePin() {
  // Pin: kepala bola merah + badan putih (meniru pin SVG lama), + cincin radar di dasar.
  const group = new THREE.Group()

  const body = new THREE.Mesh(sharedPinGeo, sharedPinMat)   // kerucut badan
  body.position.y = 1.1
  body.rotation.x = Math.PI            // ujung lancip ke bawah
  group.add(body)

  const head = new THREE.Mesh(sharedHeadGeo, sharedHeadMat) // bola kepala
  head.position.y = 2.1
  group.add(head)

  const radarMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.5,
    side: THREE.DoubleSide, depthWrite: false,
  })
  const radar = new THREE.Mesh(sharedRadarGeo, radarMat)
  radar.rotation.x = -Math.PI / 2      // rebah di permukaan jalan
  radar.position.y = 0.02
  group.add(radar)
  disposables.push(radarMat)

  group.userData = { radar, radarMat, phase: Math.random() * 2, popT: 0, active: false }
  group.visible = false
  group.scale.setScalar(0)
  return group
}

function init() {
  const el = host.value
  const w = el.clientWidth || 600
  const h = el.clientHeight || 312

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200)
  camera.position.set(0, 4.2, 9)
  camera.lookAt(0, 0.6, -18)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio?.(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.setClearColor(0x000000, 0)  // transparan → banner oranye tembus
  el.appendChild(renderer.domElement)

  // Lighting (material Standard butuh cahaya)
  scene.add(new THREE.AmbientLight(0xffffff, 1.1))
  const dir = new THREE.DirectionalLight(0xffffff, 1.3)
  dir.position.set(3, 8, 4)
  scene.add(dir)

  // Jalan
  roadTexture = makeRoadTexture()
  const roadGeo = new THREE.PlaneGeometry(9, ROAD_LEN)
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTexture, roughness: 0.9, metalness: 0,
    transparent: true, opacity: 0.92,
  })
  const road = new THREE.Mesh(roadGeo, roadMat)
  road.rotation.x = -Math.PI / 2
  road.position.set(0, 0, SPAWN_Z / 2 + DESPAWN_Z / 2)
  scene.add(road)
  disposables.push(roadGeo, roadMat)

  // Pool pin + material/geo bersama
  sharedPinGeo = new THREE.ConeGeometry(0.42, 1.4, 20)
  sharedHeadGeo = new THREE.SphereGeometry(0.5, 20, 16)
  sharedRadarGeo = new THREE.RingGeometry(0.7, 0.9, 40)
  sharedPinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
  sharedHeadMat = new THREE.MeshStandardMaterial({ color: 0xe8441e, roughness: 0.4, emissive: 0x3a0d05 })
  disposables.push(sharedPinGeo, sharedHeadGeo, sharedRadarGeo, sharedPinMat, sharedHeadMat)

  for (let i = 0; i < 6; i++) {
    const p = makePin()
    scene.add(p)
    pins.push(p)
  }

  clock = new THREE.Clock()

  if (REDUCED) {
    // Hormati reduced-motion: tampilkan satu frame statis dengan beberapa pin terpasang.
    seedStaticPins()
    renderer.render(scene, camera)
  } else {
    renderer.setAnimationLoop(animate)
  }

  ro = new ResizeObserver(() => {
    const w = el.clientWidth, h = el.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    if (REDUCED) renderer.render(scene, camera)
  })
  ro.observe(el)
}

let spawnTimer = 0
let spawnIdx = 0

function spawnPin() {
  const p = pins.find((x) => !x.userData.active)
  if (!p) return
  const lane = (spawnIdx % 3 - 1) * 2.1   // -2.1, 0, 2.1 bergantian
  spawnIdx++
  p.position.set(lane, 0, SPAWN_Z)
  p.userData.active = true
  p.userData.popT = 0
  p.visible = true
  p.scale.setScalar(0)
}

function seedStaticPins() {
  const zs = [-40, -22, -8]
  zs.forEach((z, i) => {
    const p = pins[i]
    p.position.set((i % 3 - 1) * 2.1, 0, z)
    p.userData.active = true
    p.visible = true
    p.scale.setScalar(1)
  })
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.elapsedTime

  // Jalan bergerak maju → gulirkan tekstur ke arah kamera
  if (roadTexture) roadTexture.offset.y -= dt * (SPEED / ROAD_LEN) * 6

  // Spawn pin berjeda
  spawnTimer += dt
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer -= SPAWN_INTERVAL
    spawnPin()
  }

  // Gerakkan & animasikan tiap pin aktif
  for (const p of pins) {
    const u = p.userData
    if (!u.active) continue
    p.position.z += dt * SPEED      // bergerak menuju kamera

    // efek "muncul" (pop in)
    if (u.popT < 1) {
      u.popT = Math.min(1, u.popT + dt * 2.5)
      const s = easeOutBack(u.popT)
      p.scale.setScalar(s)
    }

    // efek radar: cincin memuai & memudar, berulang dengan fase per pin
    const cyc = (t * 0.9 + u.phase) % 1
    const scale = 0.4 + cyc * 2.6
    u.radar.scale.setScalar(scale)
    u.radarMat.opacity = 0.55 * (1 - cyc)

    // daur ulang bila melewati kamera
    if (p.position.z > DESPAWN_Z) {
      u.active = false
      p.visible = false
    }
  }

  renderer.render(scene, camera)
}

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

function cleanup() {
  ro?.disconnect()
  if (raf) cancelAnimationFrame(raf)
  renderer?.setAnimationLoop(null)
  roadTexture?.dispose()
  for (const d of disposables) d.dispose?.()
  scene?.traverse((obj) => {
    obj.geometry?.dispose?.()
    const m = obj.material
    if (Array.isArray(m)) m.forEach((x) => x.dispose?.())
    else m?.dispose?.()
  })
  renderer?.dispose()
  renderer?.domElement?.remove()
  renderer = scene = camera = clock = roadTexture = null
  pins = []
}

onMounted(init)
onBeforeUnmount(cleanup)
</script>

<style scoped>
.road3d {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* di-clip oleh .banner (overflow:hidden) sehingga jalan tidak melewati container */
}
.road3d :deep(canvas) { display: block; }
</style>
