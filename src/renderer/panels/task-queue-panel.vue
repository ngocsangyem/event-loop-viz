<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import { taskQueueOf } from '../scene/task-queue-model'
import { TASK_SOURCE_LABEL } from './panel-labels'
import PanelCard from './panel-card.vue'
import QueueList from './queue-list.vue'
import type { QueueItem } from './queue-list.vue'

const props = defineProps<{ state: ReplayState }>()

/** The running Task first, then the queue head to tail. */
const items = computed(() => {
  const { tasks, running } = taskQueueOf(props.state)
  const queued = tasks.map(
    (task): QueueItem => ({ id: task.taskId, label: TASK_SOURCE_LABEL[task.source] }),
  )
  return running
    ? [{ id: running.taskId, label: TASK_SOURCE_LABEL[running.source], detail: 'running', active: true }, ...queued]
    : queued
})
</script>

<template>
  <PanelCard
    title="Task Queue"
    info="Macrotasks: the Script itself, timer callbacks and MessagePort messages. The event loop runs one Task, then drains the microtask queue."
    :count="state.tasks.length"
  >
    <QueueList :items="items" empty="No tasks queued" testid="panel-task-queue" />
  </PanelCard>
</template>
