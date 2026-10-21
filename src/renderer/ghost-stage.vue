<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'

/** Where the Script stands before a Trace exists: idle, being recorded, or refused for an Unsupported API. */
export type GhostStageState = 'idle' | 'running' | 'blocked'

/**
 * The stage in edit mode, with no Trace to replay: one ghost cell per pane, each saying what will
 * appear there, and a card that says what to do (or what is happening) next. Ghosts are outlines
 * only, so they never read as real, empty panes.
 */
const props = defineProps<{ state: GhostStageState }>()
const { t } = useI18n()

const CELLS = [
  { id: 'stack', hue: 'bg-stack', title: 'panels.callStack.title', hint: 'ghostStage.stack' },
  { id: 'job', hue: 'bg-job', title: 'panels.microtaskQueue.title', hint: 'ghostStage.jobs' },
  { id: 'task', hue: 'bg-task', title: 'panels.taskQueue.title', hint: 'ghostStage.tasks' },
  { id: 'webapi', hue: 'bg-webapi', title: 'panels.webApis.title', hint: 'ghostStage.webApis' },
] as const

const card = computed(() => {
  switch (props.state) {
    case 'running':
      return { label: 'ghostStage.busy', variant: 'now', title: 'ghostStage.busyTitle', body: 'ghostStage.busyBody' } as const
    case 'blocked':
      return { label: 'ghostStage.blocked', variant: 'error', title: 'ghostStage.blockedTitle', body: 'ghostStage.blockedBody' } as const
    default:
      return { label: 'ghostStage.ready', variant: 'muted', title: 'ghostStage.readyTitle', body: 'ghostStage.readyBody' } as const
  }
})
</script>

<template>
  <div class="bg-border relative grid min-h-[430px] grid-rows-[minmax(0,1fr)_130px] gap-px" data-testid="ghost-stage" :data-state="state">
    <div class="grid grid-rows-[repeat(4,minmax(150px,1fr))] gap-px md:grid-cols-2 md:grid-rows-2">
      <div
        v-for="cell in CELLS"
        :key="cell.id"
        class="border-border-soft bg-background flex flex-col gap-1.5 border px-5 py-4"
        aria-hidden="true"
      >
        <div class="label-mono flex items-center gap-2">
          <span :class="['size-2 shrink-0', cell.hue]" />
          {{ t(cell.title) }}
        </div>
        <p class="text-muted-foreground text-[12.5px] leading-[17px]">{{ t(cell.hint) }}</p>
      </div>
    </div>
    <div class="border-border-soft bg-background flex flex-col gap-1.5 border px-5 py-4" aria-hidden="true">
      <div class="label-mono flex items-center gap-2">
        <span class="bg-console size-2 shrink-0" />
        {{ t('console.title') }}
      </div>
      <p class="text-muted-foreground text-[12.5px] leading-[17px]">{{ t('ghostStage.console') }}</p>
    </div>
    <!-- The card sits over the ghosts' crossing; polite so a Run starting or being refused is heard. -->
    <div
      class="bg-popover border-border absolute top-1/2 left-1/2 flex w-[460px] max-w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 border p-7"
      role="status"
    >
      <Badge :variant="card.variant"><span v-if="state === 'blocked'" aria-hidden="true">⚠&nbsp;</span>{{ t(card.label) }}</Badge>
      <h2 class="text-foreground text-2xl leading-[30px] font-medium tracking-[-0.02em]">{{ t(card.title) }}</h2>
      <p class="text-foreground-2 text-[15px] leading-6">{{ t(card.body) }}</p>
    </div>
  </div>
</template>
