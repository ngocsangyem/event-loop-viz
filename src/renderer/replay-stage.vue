<script setup lang="ts">
import { computed, defineAsyncComponent, provide } from 'vue'
import type { Player } from '../player/player'
import { createInitialState } from '../player/replay-state'
import type { ReplayState } from '../player/replay-state'
import type { TraceEvent } from '../trace/trace-event'
import { Card, CardContent } from '@/components/ui/card'
import ConsolePanel from './console-panel.vue'
import StepCaption from './step-caption.vue'
import CallStackPanel from './panels/call-stack-panel.vue'
import ChipTravelLayer from './panels/chip-travel-layer.vue'
import EventLoopPanel from './panels/event-loop-panel.vue'
import MicrotaskQueuePanel from './panels/microtask-queue-panel.vue'
import TaskQueuePanel from './panels/task-queue-panel.vue'
import WebApisPanel from './panels/web-apis-panel.vue'
import { STEP_FOCUS_KEY } from './panels/step-focus-keys'
import { stepFocusOf } from './panels/step-focus-model'
import type { SameView } from './use-playback'
import type { VisualizerView } from './use-visualizer-view'

// The 3D Scene and the Diagram are opt-in, so their code and styles load only when picked.
const SceneView = defineAsyncComponent(() => import('./scene/event-loop-scene.vue'))
const EventLoopDiagram = defineAsyncComponent(() => import('./diagram/event-loop-diagram.vue'))

/**
 * The middle column: the caption of the current step, then the chosen view of the same state.
 * Panels is a ruled grid in run order (Call Stack, Microtask Queue, Task Queue, Web APIs), the
 * Event Loop beside the console below. The panes the step changed are marked through
 * STEP_FOCUS_KEY.
 */
const props = defineProps<{
  view: VisualizerView
  events: readonly TraceEvent[]
  position: number
  state: ReplayState
  previous: ReplayState | null
  player: Player | null
  /** The Script the Trace ran; chips quote it. */
  source: string
  running: boolean
  sameView?: SameView
  travelMs: number
}>()

// The first step has no step before it; compared with the empty loop, everything it shows is new.
const EMPTY = createInitialState()
const focus = computed(() => stepFocusOf(props.player ? (props.previous ?? EMPTY) : null, props.state))
provide(STEP_FOCUS_KEY, focus)
</script>

<template>
  <div class="flex min-w-0 flex-col">
    <StepCaption :events="events" :position="position" :state="state" :running="running" />
    <div class="ruled bg-border grid gap-px border-t">
      <template v-if="view === 'panels'">
        <ChipTravelLayer
          :player="player"
          :position="position"
          :source="source"
          :same-view="sameView"
          :travel-ms="travelMs"
        />
        <div class="ruled bg-border grid gap-px md:grid-cols-2">
          <CallStackPanel :state="state" :source="source" />
          <MicrotaskQueuePanel :state="state" :source="source" />
          <TaskQueuePanel :state="state" :source="source" />
          <WebApisPanel :state="state" :source="source" />
        </div>
        <div class="ruled bg-border grid gap-px md:grid-cols-[minmax(0,1fr)_auto]">
          <ConsolePanel :output="state.console" class="max-md:order-last" />
          <EventLoopPanel :state="state" />
        </div>
      </template>
      <template v-else>
        <Card size="sm" class="min-w-0">
          <CardContent>
            <EventLoopDiagram v-if="view === 'diagram'" :state="state" :event="events[position]" />
            <SceneView v-else :state="state" :previous="previous" />
          </CardContent>
        </Card>
        <ConsolePanel :output="state.console" />
      </template>
    </div>
  </div>
</template>
