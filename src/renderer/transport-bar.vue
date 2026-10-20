<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { Player } from '../player/player'
import { SPEEDS, usePlayback } from './use-playback'

const props = defineProps<{ player: Player | null }>()
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

/** Typing in the editor or a field must never trigger transport shortcuts. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

function onKeydown(event: KeyboardEvent) {
  if (!props.player || isTyping(event.target)) return
  // Modified arrows are reserved for Tick/Task jumps.
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  const actions: Record<string, () => void> = {
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
    <button type="button" :disabled="!player || atStart" @click="step('prev')">Prev</button>
    <button type="button" :disabled="!player" :aria-pressed="playing" @click="toggle">
      {{ playing ? 'Pause' : 'Play' }}
    </button>
    <button type="button" :disabled="!player || atEnd" @click="step('next')">Next</button>
    <label>
      Speed
      <select v-model.number="speed" :disabled="!player" aria-label="Speed">
        <option v-for="s in SPEEDS" :key="s" :value="s">{{ s }}×</option>
      </select>
    </label>
  </div>
</template>
