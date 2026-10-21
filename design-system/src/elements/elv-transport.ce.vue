<script setup lang="ts">
import { computed } from 'vue'
import { parseListProp } from '../parse-list-prop'

/**
 * The transport row of the control dock (DESIGN.md · Control dock, row 2): mono words with printed
 * keys, `[⌥←]TASK [⇧←]TICK [←]STEP [␣]PLAY [→]STEP [⇧→]TICK [⌥→]TASK`. PLAY is the only primary
 * (ink-filled) control; `playing` swaps it for PAUSE. `at-start` / `at-end` disable the back / forward
 * groups, and `disabled` lists individual controls. `layout="touch"` is the phone dock: five 52px
 * targets `← TICK` `← STEP` `PLAY` `STEP →` `TICK →` with no hotkeys. The element does not bind
 * keys; the app owns the keyboard map and reflects it here. Emits `control` with the control id.
 */
export type TransportControl =
  | 'task-back' | 'tick-back' | 'step-back' | 'play' | 'pause'
  | 'step-forward' | 'tick-forward' | 'task-forward'

interface Def {
  id: TransportControl
  word: string
  key: string
  name: string
}

const props = withDefaults(
  defineProps<{
    /** Playback is running: PLAY becomes PAUSE. */
    playing?: boolean
    /** Playhead is on the first Trace Event: disables the back controls. */
    atStart?: boolean
    /** Playhead is on the last Trace Event: disables the forward controls. */
    atEnd?: boolean
    /** Extra controls to disable: array or JSON string of control ids. */
    disabled?: TransportControl[] | string
    layout?: 'desktop' | 'touch'
  }>(),
  { disabled: () => [], layout: 'desktop' },
)
const emit = defineEmits<{ control: [id: TransportControl] }>()

const BACK: Def[] = [
  { id: 'task-back', word: 'Task', key: '⌥←', name: 'Previous Task (Alt ←)' },
  { id: 'tick-back', word: 'Tick', key: '⇧←', name: 'Previous Tick (Shift ←)' },
  { id: 'step-back', word: 'Step', key: '←', name: 'Step back (←)' },
]
const FORWARD: Def[] = [
  { id: 'step-forward', word: 'Step', key: '→', name: 'Step forward (→)' },
  { id: 'tick-forward', word: 'Tick', key: '⇧→', name: 'Next Tick (Shift →)' },
  { id: 'task-forward', word: 'Task', key: '⌥→', name: 'Next Task (Alt →)' },
]

const touch = computed(() => props.layout === 'touch')
const off = computed(() => new Set(parseListProp<string>(props.disabled)))
// The phone dock drops the TASK jumps and prints the arrow beside the word instead of a hotkey.
const back = computed(() => (touch.value ? BACK.filter((d) => d.word !== 'Task') : BACK))
const forward = computed(() => (touch.value ? FORWARD.filter((d) => d.word !== 'Task') : FORWARD))
const play = computed<Def>(() => ({
  id: props.playing ? 'pause' : 'play',
  word: props.playing ? 'Pause' : 'Play',
  key: '␣',
  name: props.playing ? 'Pause (Space)' : 'Play (Space)',
}))

function isOff(def: Def, side: 'back' | 'forward' | 'play') {
  if (off.value.has(def.id)) return true
  return (side === 'back' && props.atStart) || (side === 'forward' && props.atEnd)
}
/** Touch words carry the direction: `← TICK`, `STEP →`. */
function word(def: Def, side: 'back' | 'forward' | 'play') {
  if (!touch.value || side === 'play') return def.word
  return side === 'back' ? `← ${def.word}` : `${def.word} →`
}
</script>

<template>
  <div class="transport" role="toolbar" aria-label="Transport" :data-layout="layout">
    <template v-for="side in (['back', 'play', 'forward'] as const)" :key="side">
      <button
        v-for="def in side === 'back' ? back : side === 'forward' ? forward : [play]"
        :key="def.id"
        class="ctl"
        type="button"
        :data-primary="side === 'play'"
        :aria-label="def.name"
        :aria-pressed="side === 'play' ? playing : undefined"
        :disabled="isOff(def, side)"
        @click="emit('control', def.id)"
      >
        <span v-if="!touch" class="key" aria-hidden="true">[{{ def.key }}]</span>
        <span>{{ word(def, side) }}</span>
      </button>
    </template>
  </div>
</template>

<style>
/* Control styles are a minimal copy of elv-button's; a shared style module would remove the copy. */
:host {
  display: block;
}
:host([hidden]) {
  display: none;
}
.transport {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}
.ctl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--color-ink);
  font: 500 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out);
}
.ctl:hover:not(:disabled) {
  background: var(--color-hover-row);
}
.ctl:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.ctl:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.ctl[data-primary='true'] {
  min-width: 96px;
  background: var(--primary);
  color: var(--primary-foreground);
}
.ctl[data-primary='true']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary) 86%, transparent);
}
.key {
  color: var(--color-ink-3);
  font-weight: 400;
}
.ctl[data-primary='true'] .key {
  color: color-mix(in srgb, var(--primary-foreground) 70%, transparent);
}
.transport[data-layout='touch'] {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}
.transport[data-layout='touch'] .ctl,
.transport[data-layout='touch'] .ctl[data-primary='true'] {
  height: 52px;
  min-width: 0;
  padding: 0 4px;
}
</style>
