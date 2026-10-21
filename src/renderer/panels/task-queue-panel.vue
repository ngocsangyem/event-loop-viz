<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../../player/replay-state'
import { chipLabelsOf, chipOf, chipsOf } from './callback-chip-model'
import { taskQueueOf } from '../scene/task-queue-model'
import PanelCard from './panel-card.vue'
import QueueList from './queue-list.vue'
import type { QueueItem } from './queue-list.vue'

const props = defineProps<{ state: ReplayState; source: string }>()
const { t } = useI18n()

/** The running Task first, then the queue head to tail. */
const items = computed(() => {
  const chips = chipsOf(props.state, props.source, chipLabelsOf(t))
  const { tasks, running } = taskQueueOf(props.state)
  const queued = tasks.map(
    (task): QueueItem => ({
      id: task.taskId,
      label: t(`panels.taskSource.${task.source}`),
      ...chipOf(chips, task.taskId, 'taskq'),
    }),
  )
  return running
    ? [
        {
          id: running.taskId,
          label: t(`panels.taskSource.${running.source}`),
          detail: t('panels.running'),
          active: true,
          ...chipOf(chips, running.taskId, 'taskq-running'),
        },
        ...queued,
      ]
    : queued
})
</script>

<template>
  <PanelCard
    concept="task"
    :title="t('panels.taskQueue.title')"
    :info="t('panels.taskQueue.info')"
    :count="state.tasks.length"
  >
    <QueueList :items="items" :empty="t('panels.taskQueue.empty')" testid="panel-task-queue" />
  </PanelCard>
</template>
