<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import IsoRaw from './iso-raw.vue'
import QueueToken from './queue-token.vue'
import { jobTrayBackSvg, jobTrayFrontSvg, JOB_TRAY } from './job-queue-geometry'
import { jobQueueOf } from './job-queue-model'
import { QUEUE_DRAW_CAP, overflowMatrix, pitchFor, tokenPlan } from './queue-tray-geometry'

// `previous` is accepted by every part so transitions can compare states without touching
// the scene root; this part draws only `state`.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const model = computed(() => jobQueueOf(props.state))
const drawn = computed(() => model.value.jobs.slice(0, QUEUE_DRAW_CAP))
const pitch = computed(() => pitchFor(JOB_TRAY, drawn.value.length))
const more = computed(() => model.value.jobs.length - drawn.value.length)
</script>

<template>
  <g data-part="microtask-queue" :data-queued="model.jobs.length">
    <IsoRaw :svg="jobTrayBackSvg" />
    <QueueToken
      v-if="model.running"
      :key="model.running.jobId"
      :plan="JOB_TRAY.running"
      :label="model.running.kind"
      running
      data-testid="scene-running-job"
      :data-job-id="model.running.jobId"
      :data-kind="model.running.kind"
    />
    <QueueToken
      v-for="(job, index) in drawn"
      :key="job.jobId"
      :plan="tokenPlan(JOB_TRAY, index, pitch)"
      :label="job.kind"
      data-testid="scene-job"
      :data-job-id="job.jobId"
      :data-kind="job.kind"
    />
    <IsoRaw :svg="jobTrayFrontSvg" />
    <text
      v-if="more > 0"
      class="iso-face-text"
      data-tone="hi"
      text-anchor="end"
      font-size="3.8"
      :transform="overflowMatrix(JOB_TRAY)"
    >
      +{{ more }}
    </text>
  </g>
</template>
