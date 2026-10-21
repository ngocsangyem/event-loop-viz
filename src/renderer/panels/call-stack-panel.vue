<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import type { StackPlateModel } from '../scene/call-stack-model'
import { visibleFrames } from './panel-view-model'
import PanelCard from './panel-card.vue'
import QueueList from './queue-list.vue'
import type { QueueItem } from './queue-list.vue'

const props = defineProps<{ state: ReplayState }>()

const CONSOLE_METHODS = new Set(['log', 'info', 'warn', 'error'])

const label = (frame: StackPlateModel) =>
  frame.builtin && CONSOLE_METHODS.has(frame.label) ? `console.${frame.label}` : frame.label

/** Top of the stack first, like a stack of plates seen from above. */
const items = computed(() => {
  const shown = visibleFrames(props.state)
  const top = shown.length - 1
  return shown
    .map((frame, i): QueueItem => ({ id: frame.frameId, label: label(frame), active: i === top }))
    .reverse()
})
</script>

<template>
  <PanelCard
    title="Call Stack"
    info="Frames of the code running now, top first. The event loop picks the next Task only when the stack is empty. Built-ins called by other built-ins are hidden."
    :count="items.length"
  >
    <QueueList :items="items" empty="Empty" testid="panel-call-stack" />
  </PanelCard>
</template>
