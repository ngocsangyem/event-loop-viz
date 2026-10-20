<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import IsoRaw from './iso-raw.vue'
import QueueToken from './queue-token.vue'
import { sourceLabel, taskTrayBackSvg, taskTrayFrontSvg, TASK_TRAY } from './task-queue-geometry'
import { taskQueueOf } from './task-queue-model'
import { QUEUE_DRAW_CAP, overflowMatrix, pitchFor, tokenPlan } from './queue-tray-geometry'

// `previous` is accepted by every part so transitions can compare states without touching
// the scene root; this part draws only `state`.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const model = computed(() => taskQueueOf(props.state))
const drawn = computed(() => model.value.tasks.slice(0, QUEUE_DRAW_CAP))
const pitch = computed(() => pitchFor(TASK_TRAY, drawn.value.length))
const more = computed(() => model.value.tasks.length - drawn.value.length)
</script>

<template>
  <g data-part="task-queue" :data-queued="model.tasks.length">
    <IsoRaw :svg="taskTrayBackSvg" />
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
    <QueueToken
      v-for="(task, index) in drawn"
      :key="task.taskId"
      :plan="tokenPlan(TASK_TRAY, index, pitch)"
      :label="sourceLabel(task.source)"
      data-testid="scene-task"
      :data-task-id="task.taskId"
      :data-source="task.source"
    />
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
