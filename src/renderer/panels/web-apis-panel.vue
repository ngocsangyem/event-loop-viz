<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import { timerShelfOf } from '../scene/timer-shelf-model'
import PanelCard from './panel-card.vue'
import QueueList from './queue-list.vue'
import type { QueueItem } from './queue-list.vue'

const props = defineProps<{ state: ReplayState }>()

/** Pending timers, soonest due first. */
const items = computed(() =>
  timerShelfOf(props.state, Number.POSITIVE_INFINITY).shown.map(
    (timer): QueueItem => ({
      id: timer.tid,
      label: `${timer.repeat ? 'setInterval' : 'setTimeout'} ${timer.tid}`,
      detail: `due ${timer.due}`,
    }),
  ),
)
</script>

<template>
  <PanelCard
    title="Web APIs"
    info="Timers the host is holding. When a timer is due on the Virtual Clock, its callback joins the Task Queue."
    :count="items.length"
  >
    <QueueList :items="items" empty="No pending timers" testid="panel-web-apis" />
  </PanelCard>
</template>
