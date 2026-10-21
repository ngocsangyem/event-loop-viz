<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import { callStackOf } from '../scene/call-stack-model'
import PanelCard from './panel-card.vue'
import QueueList from './queue-list.vue'
import type { QueueItem } from './queue-list.vue'

const props = defineProps<{ state: ReplayState }>()

/** Top of the stack first, like a stack of plates seen from above. */
const items = computed(() =>
  callStackOf(props.state)
    .frames.map(
      (frame): QueueItem => ({
        id: frame.frameId,
        label: frame.label,
        detail: frame.builtin ? 'built-in' : undefined,
        active: frame.isTop,
      }),
    )
    .reverse(),
)
</script>

<template>
  <PanelCard
    title="Call Stack"
    info="Frames of the code running now. The top frame runs; the event loop picks the next Task only when the stack is empty."
    :count="items.length"
  >
    <QueueList :items="items" empty="Empty" testid="panel-call-stack" />
  </PanelCard>
</template>
