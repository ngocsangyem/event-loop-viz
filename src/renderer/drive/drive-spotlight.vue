<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { usePrefersReducedMotion } from '../scene/scene-motion'
import DrivePopover from './drive-popover.vue'
import { placeDrivePopover } from './place-drive-popover'
import { driveTargetElement, measureDriveTarget, revealDriveTarget } from './drive-target-rect'
import type { DriveInfo, DriveSpot } from './drive-step'

/**
 * Drive me's spotlight: the page dims under a scrim with a rectangular hole around the step's
 * spot, outlined by a 1px brand rule (radius 0, no shadow), and the step card sits beside it. A
 * second hole keeps the Script line the step is about in view, so the code is never dimmed.
 * Between steps the hole and the card glide (GSAP); under reduced motion they jump. Clicks on
 * the scrim are swallowed, the hole stays clickable. The parent mounts it only while driving.
 */
const props = defineProps<{
  spot: DriveSpot | null
  index: number
  total: number
  title: string
  body: string
  note?: string
  info?: DriveInfo
  /** The Script line the step is about; lit in the Source pane next to the spot. */
  codeLine?: number
  /** Space at the bottom the card must keep clear: the pinned dock. */
  bottomReserve?: number
  /** Changes when the page swaps what is drawn (the visualization), so the spot is found again. */
  layoutKey?: string
}>()
const emit = defineEmits<{ next: []; prev: []; end: [] }>()

const PAD = 8
const GLIDE_S = 0.42
const reduced = usePrefersReducedMotion()
const card = useTemplateRef<HTMLElement>('card')
const viewport = shallowRef({ width: window.innerWidth, height: window.innerHeight })
const hole = reactive({ x: 0, y: 0, w: 0, h: 0 })
const lit = shallowRef(false)
const codeHole = reactive({ x: 0, y: 0, w: 0, h: 0 })
const codeLit = shallowRef(false)
let tweens: gsap.core.Tween[] = []
let observer: ResizeObserver | null = null
let frame = 0
let returnFocus: HTMLElement | null = null
/** A spot that is not drawn yet (a view still loading) is looked for again, a few times. */
const MAX_SEARCHES = 12
let searches = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

type Box = { x: number; y: number; w: number; h: number }
const cut = (b: Box) => `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`
const scrimPath = computed(() => {
  const { width: w, height: h } = viewport.value
  return `M0 0H${w}V${h}H0Z${lit.value ? cut(hole) : ''}${codeLit.value ? cut(codeHole) : ''}`
})

/** The code spot, unless the step already lights that line (or the whole Source pane) itself. */
const codeSpot = computed(() =>
  props.codeLine === undefined || props.spot?.target === 'source' ? null : { target: 'source' as const, line: props.codeLine })

const padded = (r: { left: number; top: number; width: number; height: number }, pad: number): Box =>
  ({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 })
/** Two holes must not overlap: evenodd would fill their overlap back in. */
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

function moveHole(box: Box, to: Box | null, on: { value: boolean }, motion: boolean) {
  if (to) {
    if (motion && on.value) tweens.push(gsap.to(box, { ...to, duration: GLIDE_S, ease: 'power3.inOut' }))
    else Object.assign(box, to)
  }
  on.value = to !== null
}

/** Measures the spot and moves the hole and the card there; `glide` animates from where they are. */
function draw(glide: boolean) {
  viewport.value = { width: window.innerWidth, height: window.innerHeight }
  const rect = props.spot ? measureDriveTarget(props.spot) : null
  clearTimeout(searchTimer)
  if (props.spot && !rect && searches < MAX_SEARCHES) {
    searches++
    searchTimer = setTimeout(() => {
      watchTarget()
      draw(true)
    }, 120)
  }
  const next = rect && padded(rect, PAD)
  const codeRect = codeSpot.value ? measureDriveTarget(codeSpot.value) : null
  const codeNext = codeRect && padded(codeRect, 2)
  const code = codeNext && !(next && overlaps(next, codeNext)) ? codeNext : null
  const el = card.value
  const size = el ? { width: el.offsetWidth, height: el.offsetHeight } : { width: 360, height: 180 }
  const spot = next && { left: next.x, top: next.y, width: next.w, height: next.h }
  const place = placeDrivePopover({ spot, size, viewport: viewport.value, bottomReserve: props.bottomReserve ?? 0 })

  for (const tween of tweens) tween.kill()
  tweens = []
  const motion = glide && !reduced.value
  moveHole(hole, next, lit, motion)
  moveHole(codeHole, code, codeLit, motion)
  if (el) {
    if (motion) tweens.push(gsap.to(el, { x: place.left, y: place.top, duration: GLIDE_S, ease: 'power3.inOut' }))
    else gsap.set(el, { x: place.left, y: place.top })
  }
}

/** Layout changes (scroll, resize, the target growing) follow at once, without a glide. */
function follow() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => draw(false))
}

function watchTarget() {
  observer?.disconnect()
  if (typeof ResizeObserver !== 'function') return
  observer = new ResizeObserver(follow)
  for (const spot of [props.spot, codeSpot.value]) {
    const el = spot ? driveTargetElement(spot) : null
    if (el) observer.observe(el)
  }
}

// A new step: let the replay patch, bring the spot into view, then glide to it.
watch(
  () => [props.spot?.target, props.spot?.line, props.codeLine, props.index, props.layoutKey] as const,
  async () => {
    searches = 0
    await nextTick()
    // The code line first: it scrolls inside the editor; the spot last, so it ends up in view.
    if (codeSpot.value) revealDriveTarget(codeSpot.value, reduced.value)
    if (props.spot) revealDriveTarget(props.spot, reduced.value)
    watchTarget()
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => draw(true))
  },
)

onMounted(() => {
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  if (codeSpot.value) revealDriveTarget(codeSpot.value, true)
  if (props.spot) revealDriveTarget(props.spot, true)
  watchTarget()
  draw(false)
  card.value?.querySelector<HTMLElement>('[role=dialog]')?.focus()
  window.addEventListener('resize', follow)
  window.addEventListener('scroll', follow, true)
  void document.fonts?.ready.then(follow)
})

onBeforeUnmount(() => {
  for (const tween of tweens) tween.kill()
  cancelAnimationFrame(frame)
  clearTimeout(searchTimer)
  observer?.disconnect()
  window.removeEventListener('resize', follow)
  window.removeEventListener('scroll', follow, true)
  if (returnFocus?.isConnected) returnFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40" style="pointer-events: none" data-testid="drive-spotlight">
      <svg class="absolute inset-0 h-full w-full" :viewBox="`0 0 ${viewport.width} ${viewport.height}`" aria-hidden="true">
        <!-- evenodd turns the inner rect into a hole: clicks inside it reach the page. -->
        <path :d="scrimPath" fill-rule="evenodd" style="fill: var(--scrim); pointer-events: auto" />
        <rect
          v-if="lit"
          :x="hole.x + 0.5"
          :y="hole.y + 0.5"
          :width="Math.max(hole.w - 1, 0)"
          :height="Math.max(hole.h - 1, 0)"
          fill="none"
          style="stroke: var(--brand)"
          stroke-width="1"
        />
        <!-- The code line: a quieter dashed rule, so the spot still reads as the main thing. -->
        <rect
          v-if="codeLit"
          :x="codeHole.x + 0.5"
          :y="codeHole.y + 0.5"
          :width="Math.max(codeHole.w - 1, 0)"
          :height="Math.max(codeHole.h - 1, 0)"
          fill="none"
          style="stroke: var(--brand)"
          stroke-width="1"
          stroke-dasharray="3 3"
          data-testid="drive-code-hole"
        />
      </svg>
      <div ref="card" class="absolute top-0 left-0" style="pointer-events: auto">
        <DrivePopover :index="index" :total="total" :title="title" :body="body" :note="note" :info="info" @next="emit('next')" @prev="emit('prev')" @end="emit('end')">
          <!-- Forwarded only when given, so the popover falls back to the step body. -->
          <template v-if="$slots.default" #default><slot /></template>
        </DrivePopover>
      </div>
    </div>
  </Teleport>
</template>
