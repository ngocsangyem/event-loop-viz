<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../../player/replay-state'
import { chipLabelsOf, chipOf, chipsOf } from './callback-chip-model'
import { jobQueueOf } from '../scene/job-queue-model'
import PanelCard from './panel-card.vue'
import QueueList from './queue-list.vue'
import type { QueueItem } from './queue-list.vue'

const props = defineProps<{ state: ReplayState; source: string }>()
const { t } = useI18n()

/** The running Job first, then the queue head to tail. */
const items = computed(() => {
  const chips = chipsOf(props.state, props.source, chipLabelsOf(t))
  const { jobs, running } = jobQueueOf(props.state)
  const queued = jobs.map(
    (job): QueueItem => ({
      id: job.jobId,
      label: t(`panels.jobKind.${job.kind}`),
      ...chipOf(chips, job.jobId, 'microq'),
    }),
  )
  return running
    ? [
        {
          id: running.jobId,
          label: t(`panels.jobKind.${running.kind}`),
          detail: t('panels.running'),
          active: true,
          ...chipOf(chips, running.jobId, 'microq-running'),
        },
        ...queued,
      ]
    : queued
})
</script>

<template>
  <PanelCard
    concept="job"
    :title="t('panels.microtaskQueue.title')"
    :info="t('panels.microtaskQueue.info')"
    :count="state.jobs.length"
  >
    <QueueList :items="items" :empty="t('panels.microtaskQueue.empty')" testid="panel-microtask-queue" />
  </PanelCard>
</template>
