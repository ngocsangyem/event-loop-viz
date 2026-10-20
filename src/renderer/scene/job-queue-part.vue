<script setup lang="ts">
import { computed } from 'vue'
import type { ReplayState } from '../../player/replay-state'
import IsoRaw from './iso-raw.vue'
import QueueToken from './queue-token.vue'
import { useTrayMotion } from './queue-tray-motion'
import type { TrayEntries } from './queue-tray-motion'
import { jobTrayBackSvg, jobTrayFrontSvg, JOB_TRAY } from './job-queue-geometry'
import { jobQueueOf } from './job-queue-model'
import { QUEUE_DRAW_CAP, overflowMatrix, pitchFor, tokenPlan } from './queue-tray-geometry'

// `previous` (the state one step back) only decides how a token arrives; what stands in the
// tray once the motion ends is a function of `state` alone.
const props = defineProps<{ state: ReplayState; previous?: ReplayState | null }>()

const model = computed(() => jobQueueOf(props.state))
const drawn = computed(() => model.value.jobs.slice(0, QUEUE_DRAW_CAP))
const pitch = computed(() => pitchFor(JOB_TRAY, drawn.value.length))
const entriesOf = (queue: {
  jobs: { jobId: string }[]
  running: { jobId: string } | null
}): TrayEntries => ({
  queued: queue.jobs.map((entry) => entry.jobId),
  running: queue.running?.jobId ?? null,
})
const { onEnter, onEnterCancelled } = useTrayMotion(
  JOB_TRAY,
  'data-job-id',
  () => (props.previous ? entriesOf(jobQueueOf(props.previous)) : null),
  () => entriesOf(model.value),
)
const more = computed(() => model.value.jobs.length - drawn.value.length)
</script>

<template>
  <g data-part="microtask-queue" :data-queued="model.jobs.length">
    <IsoRaw :svg="jobTrayBackSvg" />
    <Transition :css="false" @enter="onEnter" @enter-cancelled="onEnterCancelled">
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
    </Transition>
    <TransitionGroup :css="false" @enter="onEnter" @enter-cancelled="onEnterCancelled">
      <QueueToken
        v-for="(job, index) in drawn"
        :key="job.jobId"
        :plan="tokenPlan(JOB_TRAY, index, pitch)"
        :label="job.kind"
        data-testid="scene-job"
        :data-job-id="job.jobId"
        :data-kind="job.kind"
      />
    </TransitionGroup>
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
