<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import IsoRaw from './iso-raw.vue'
import QueueToken from './queue-token.vue'
import { useTrayMotion } from './queue-tray-motion'
import type { TrayEntries } from './queue-tray-motion'
import { sourceLabel, taskTrayBackSvg, taskTrayFrontSvg, TASK_TRAY } from './task-queue-geometry'
import { taskQueueOf } from './task-queue-model'
import { QUEUE_DRAW_CAP, overflowMatrix, pitchFor, tokenPlan } from './queue-tray-geometry'

// `previous` (the state one step back) only decides how a token arrives; what stands in the
// tray once the motion ends is a function of `state` alone.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const model = computed(() => taskQueueOf(props.state))
const drawn = computed(() => model.value.tasks.slice(0, QUEUE_DRAW_CAP))
const pitch = computed(() => pitchFor(TASK_TRAY, drawn.value.length))
const entriesOf = (queue: {
  tasks: { taskId: string }[]
  running: { taskId: string } | null
}): TrayEntries => ({
  queued: queue.tasks.map((entry) => entry.taskId),
  running: queue.running?.taskId ?? null,
})
const { onEnter, onEnterCancelled } = useTrayMotion(
  TASK_TRAY,
  'data-task-id',
  () => (props.previous ? entriesOf(taskQueueOf(props.previous)) : null),
  () => entriesOf(model.value),
)
const more = computed(() => model.value.tasks.length - drawn.value.length)
</script>

<template>
  <g data-part="task-queue" :data-queued="model.tasks.length">
    <IsoRaw :svg="taskTrayBackSvg" />
    <Transition :css="false" @enter="onEnter" @enter-cancelled="onEnterCancelled">
      <QueueToken
        v-if="model.running"
        :key="model.running.taskId"
        :plan="TASK_TRAY.running"
        :label="sourceLabel(model.running.source)"
        running
        data-testid="scene-running-task"
        :data-task-id="model.running.taskId"
        :data-source="model.running.source"
      />
    </Transition>
    <TransitionGroup :css="false" @enter="onEnter" @enter-cancelled="onEnterCancelled">
      <QueueToken
        v-for="(task, index) in drawn"
        :key="task.taskId"
        :plan="tokenPlan(TASK_TRAY, index, pitch)"
        :label="sourceLabel(task.source)"
        data-testid="scene-task"
        :data-task-id="task.taskId"
        :data-source="task.source"
      />
    </TransitionGroup>
    <IsoRaw :svg="taskTrayFrontSvg" />
    <text
      v-if="more > 0"
      class="iso-face-text"
      data-tone="hi"
      text-anchor="end"
      font-size="3.8"
      :transform="overflowMatrix(TASK_TRAY)"
    >
      +{{ more }}
    </text>
  </g>
</template>
