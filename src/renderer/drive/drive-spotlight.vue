<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { usePrefersReducedMotion } from '../scene/scene-motion'
import DrivePopover from './drive-popover.vue'
import { placeDrivePopover } from './place-drive-popover'
import { driveTargetElement, measureDriveTarget, revealDriveTarget } from './drive-target-rect'
import type { DriveSpot } from './drive-step'

/**
 * Drive me's spotlight: the page dims under a scrim with one rectangular hole around the step's
 * spot, outlined by a 1px brand rule (radius 0, no shadow), and the step card sits beside it.
 * Between steps the hole and the card glide (GSAP); under reduced motion they jump. Clicks on
 * the scrim are swallowed, the hole stays clickable. The parent mounts it only while driving.
 */
const props = defineProps<{
  spot: DriveSpot | null
  index: number
  total: number
  title: string
  body: string
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
let tweens: gsap.core.Tween[] = []
let observer: ResizeObserver | null = null
let frame = 0
let returnFocus: HTMLElement | null = null
/** A spot that is not drawn yet (a view still loading) is looked for again, a few times. */
const MAX_SEARCHES = 12
let searches = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

const scrimPath = computed(() => {
  const { width: w, height: h } = viewport.value
  const outer = `M0 0H${w}V${h}H0Z`
  return lit.value ? `${outer}M${hole.x} ${hole.y}h${hole.w}v${hole.h}h${-hole.w}Z` : outer
})

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
  const next = rect && { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 }
  const el = card.value
  const size = el ? { width: el.offsetWidth, height: el.offsetHeight } : { width: 360, height: 180 }
  const spot = next && { left: next.x, top: next.y, width: next.w, height: next.h }
  const place = placeDrivePopover({ spot, size, viewport: viewport.value, bottomReserve: props.bottomReserve ?? 0 })

  for (const tween of tweens) tween.kill()
  tweens = []
  const motion = glide && !reduced.value
  if (next) {
    if (motion && lit.value) tweens.push(gsap.to(hole, { ...next, duration: GLIDE_S, ease: 'power3.inOut' }))
    else Object.assign(hole, next)
  }
  lit.value = next !== null
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
  const el = props.spot ? driveTargetElement(props.spot) : null
  if (el && typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(follow)
    observer.observe(el)
  }
}

// A new step: let the replay patch, bring the spot into view, then glide to it.
watch(
  () => [props.spot?.target, props.spot?.line, props.index, props.layoutKey] as const,
  async () => {
    searches = 0
    await nextTick()
    if (props.spot) revealDriveTarget(props.spot, reduced.value)
    watchTarget()
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => draw(true))
  },
)

onMounted(() => {
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
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
      </svg>
      <div ref="card" class="absolute top-0 left-0" style="pointer-events: auto">
        <DrivePopover :index="index" :total="total" :title="title" :body="body" @next="emit('next')" @prev="emit('prev')" @end="emit('end')">
          <!-- Forwarded only when given, so the popover falls back to the step body. -->
          <template v-if="$slots.default" #default><slot /></template>
        </DrivePopover>
      </div>
    </div>
  </Teleport>
</template>
