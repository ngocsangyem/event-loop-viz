<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { Player } from '../player/player'
import type { TraceEvent } from '../trace/trace-event'
import TimelineScrubber from './timeline-scrubber.vue'
import { SPEEDS, usePlayback } from './use-playback'

const props = defineProps<{ player: Player | null; events: readonly TraceEvent[] }>()
const position = defineModel<number>({ required: true })

const { playing, speed, toggle, pause } = usePlayback(
  computed(() => props.player),
  position,
)

const atStart = computed(() => !props.player || position.value <= props.player.first())
const atEnd = computed(() => !props.player || position.value >= props.player.last())

function step(direction: 'next' | 'prev') {
  if (props.player) position.value = props.player[direction](position.value)
}

function jump(edge: 'first' | 'last') {
  if (props.player) position.value = props.player[edge]()
}

type Unit = 'Tick' | 'Task'

/** Tick/Task jumps clamp at the Trace ends, like single steps. */
function jumpBy(unit: Unit, direction: 'next' | 'prev') {
  if (props.player) position.value = props.player[`${direction}${unit}`](position.value)
}


/** Typing in the editor or a field must never trigger transport shortcuts. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

function onKeydown(event: KeyboardEvent) {
  if (!props.player || isTyping(event.target)) return
  // Ctrl/Cmd belong to the browser and OS; Shift and Alt alone select the jump unit.
  if (event.ctrlKey || event.metaKey || (event.shiftKey && event.altKey)) return
  const modified = event.shiftKey || event.altKey
  const unit: Unit = event.shiftKey ? 'Tick' : 'Task'
  const actions: Record<string, () => void> = modified
    ? {
        ArrowRight: () => jumpBy(unit, 'next'),
        ArrowLeft: () => jumpBy(unit, 'prev'),
      }
    : {
        ' ': toggle,
        ArrowRight: () => step('next'),
        ArrowLeft: () => step('prev'),
        Home: () => jump('first'),
        End: () => jump('last'),
      }
  const action = actions[event.key]
  if (!action) return
  event.preventDefault()
  // Manual navigation takes over from autoplay, except the play/pause toggle itself.
  if (event.key !== ' ') pause()
  action()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div role="toolbar" aria-label="Playback" data-testid="transport-bar">
    <button type="button" :disabled="!player || atStart" @click="jump('first')">Go to start</button>
    <button type="button" :disabled="!player || atStart" @click="jumpBy('Task', 'prev')">
      Back one Task
    </button>
    <button type="button" :disabled="!player || atStart" @click="jumpBy('Tick', 'prev')">
      Back one Tick
    </button>
    <button type="button" :disabled="!player || atStart" @click="step('prev')">Prev</button>
    <button type="button" :disabled="!player" :aria-pressed="playing" @click="toggle">
      {{ playing ? 'Pause' : 'Play' }}
    </button>
    <button type="button" :disabled="!player || atEnd" @click="step('next')">Next</button>
    <button type="button" :disabled="!player || atEnd" @click="jumpBy('Tick', 'next')">
      Forward one Tick
    </button>
    <button type="button" :disabled="!player || atEnd" @click="jumpBy('Task', 'next')">
      Forward one Task
    </button>
    <button type="button" :disabled="!player || atEnd" @click="jump('last')">Go to end</button>
    <label>
      Speed
      <select v-model.number="speed" :disabled="!player" aria-label="Speed">
        <option v-for="s in SPEEDS" :key="s" :value="s">{{ s }}×</option>
      </select>
    </label>
    <TimelineScrubber v-model="position" :player="player" :events="events" @scrub="pause" />
  </div>
</template>

<style scoped>
[data-testid='transport-bar'] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
[data-testid='transport-bar'] :deep(.scrubber) {
  flex: 1 1 100%;
}
@media (max-width: 640px) {
  [data-testid='transport-bar'] {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  [data-testid='transport-bar'] > :deep(.scrubber),
  [data-testid='transport-bar'] > label {
    grid-column: 1 / -1;
  }
  [data-testid='transport-bar'] > label {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
