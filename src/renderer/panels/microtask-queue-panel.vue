<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import { jobQueueOf } from '../scene/job-queue-model'
import { JOB_KIND_LABEL } from './panel-labels'
import PanelCard from './panel-card.vue'
import QueueList from './queue-list.vue'
import type { QueueItem } from './queue-list.vue'

const props = defineProps<{ state: ReplayState }>()

/** The running Job first, then the queue head to tail. */
const items = computed(() => {
  const { jobs, running } = jobQueueOf(props.state)
  const queued = jobs.map((job): QueueItem => ({ id: job.jobId, label: JOB_KIND_LABEL[job.kind] }))
  return running
    ? [{ id: running.jobId, label: JOB_KIND_LABEL[running.kind], detail: 'running', active: true }, ...queued]
    : queued
})
</script>

<template>
  <PanelCard
    title="Microtask Queue"
    info="Promise reactions, thenable resolution and queueMicrotask callbacks. It drains completely after every Task, before the next Task starts."
    :count="state.jobs.length"
  >
    <QueueList :items="items" empty="No microtasks queued" testid="panel-microtask-queue" />
  </PanelCard>
</template>
