<script setup lang="ts">
/**
 * The scrubber row of the control dock (DESIGN.md · Control dock, row 1): mono `STEP 15 / 31` on
 * the left, the Virtual Clock (`0 ms`) on the right, and between them a 4px raised track with the
 * playhead (a 2px × 24px accent bar). Lanes sit under the track: blue segments = Tasks, magenta =
 * Checkpoints; 2px green ticks mark console output, red ticks mark errors.
 *
 * It is a real slider (role=slider, aria-valuemin/max/now): ←/→ step, Home/End jump, and a pointer
 * press or drag on the track seeks. Each change emits `change` with the new 1-based step in
 * `event.detail[0]`. `value` is the source of truth: when the page sets it, the playhead follows.
 *
 * `segments` and `marks` take arrays as DOM properties, or the same arrays as JSON string attributes.
 */
import { computed, ref, watch } from 'vue'
import { parseListProp } from '../parse-list-prop'

export interface ScrubberSegment {
  /** First step covered (1-based, inclusive). */
  from: number
  /** Last step covered (inclusive). */
  to: number
  kind: 'task' | 'checkpoint'
}
export interface ScrubberMark {
  /** Step the tick sits on (1-based). */
  at: number
  kind: 'console' | 'error'
}

const props = withDefaults(
  defineProps<{
    total?: number
    value?: number
    /** Virtual Clock reading, e.g. `0 ms`. */
    clock?: string
    segments?: ScrubberSegment[] | string
    marks?: ScrubberMark[] | string
  }>(),
  { total: 1, value: 1, clock: undefined, segments: () => [], marks: () => [] },
)
const emit = defineEmits<{ change: [step: number] }>()

const max = computed(() => Math.max(1, Math.floor(props.total)))
const clamp = (n: number) => Math.min(max.value, Math.max(1, Math.round(n)))
const current = ref(clamp(props.value))
watch(() => [props.value, props.total], () => (current.value = clamp(props.value)))

/** Step to horizontal position (0-100%); a one-step Run pins everything to the start. */
const pos = (step: number) => (max.value > 1 ? ((clamp(step) - 1) / (max.value - 1)) * 100 : 0)
const segs = computed(() =>
  parseListProp<ScrubberSegment>(props.segments).map((s) => ({
    kind: s.kind,
    left: pos(s.from),
    width: Math.max(pos(s.to) - pos(s.from), 0),
  })),
)
const ticks = computed(() => parseListProp<ScrubberMark>(props.marks).map((m) => ({ kind: m.kind, left: pos(m.at) })))

function seek(step: number) {
  const next = clamp(step)
  if (next === current.value) return
  current.value = next
  emit('change', next)
}
const track = ref<HTMLElement>()
function fromPointer(e: PointerEvent) {
  const r = track.value?.getBoundingClientRect()
  if (!r || r.width === 0) return
  seek(1 + ((e.clientX - r.left) / r.width) * (max.value - 1))
}
function onDown(e: PointerEvent) {
  if (e.button !== 0) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  fromPointer(e)
}
function onMove(e: PointerEvent) {
  if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) fromPointer(e)
}
function onKey(e: KeyboardEvent) {
  const to: Record<string, number> = {
    ArrowLeft: current.value - 1, ArrowDown: current.value - 1,
    ArrowRight: current.value + 1, ArrowUp: current.value + 1,
    Home: 1, End: max.value,
  }
  if (!(e.key in to)) return
  e.preventDefault()
  seek(to[e.key])
}
</script>

<template>
  <div class="scrubber">
    <span class="step">STEP {{ current }} / {{ max }}</span>
    <div
      ref="track"
      class="hit"
      role="slider"
      tabindex="0"
      aria-label="Step"
      aria-valuemin="1"
      :aria-valuemax="max"
      :aria-valuenow="current"
      :aria-valuetext="`Step ${current} of ${max}`"
      @pointerdown="onDown"
      @pointermove="onMove"
      @keydown="onKey"
    >
      <div class="track" />
      <div class="lanes">
        <span v-for="(s, i) in segs" :key="'s' + i" class="seg" :data-kind="s.kind" :style="{ left: s.left + '%', width: s.width + '%' }" />
      </div>
      <span v-for="(t, i) in ticks" :key="'t' + i" class="tick" :data-kind="t.kind" :style="{ left: t.left + '%' }" />
      <span class="playhead" :style="{ left: pos(current) + '%' }" />
    </div>
    <span class="clock">{{ clock ?? '' }}</span>
  </div>
</template>

<style>
:host {
  display: block;
  min-width: 0;
}
.scrubber {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  font: 400 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  color: var(--color-ink-2);
  font-variant-numeric: tabular-nums;
}
.step {
  font-weight: 500;
  color: var(--color-ink);
  white-space: nowrap;
}
.clock {
  min-width: 48px;
  text-align: right;
  white-space: nowrap;
  color: var(--color-ink-3);
}
.hit {
  position: relative;
  height: 24px;
  cursor: pointer;
  touch-action: none;
}
.hit:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.track {
  position: absolute;
  inset: 9px 0 auto;
  height: 4px;
  background: var(--color-bg-raised);
}
.lanes {
  position: absolute;
  inset: 16px 0 auto;
  height: 6px;
}
.seg {
  position: absolute;
  top: 0;
  height: 2px;
  min-width: 3px;
}
.seg[data-kind='task'] {
  background: var(--task);
}
.seg[data-kind='checkpoint'] {
  top: 3px;
  background: var(--job);
}
.tick {
  position: absolute;
  top: 7px;
  width: 2px;
  height: 10px;
  margin-left: -1px;
}
.tick[data-kind='console'] {
  background: var(--console);
}
.tick[data-kind='error'] {
  background: var(--error);
}
.playhead {
  position: absolute;
  top: 0;
  width: 2px;
  height: 24px;
  margin-left: -1px;
  background: var(--brand);
  pointer-events: none;
}
</style>
