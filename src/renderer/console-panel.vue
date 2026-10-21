<script setup lang="ts">
import { computed } from 'vue'
import { formatConsoleLines } from './console-lines'
import type { ObservableOutput } from '../trace/observable-output'
import { cn } from '@/lib/utils'
import PanelCard from './panels/panel-card.vue'

const props = defineProps<{ output: ObservableOutput }>()
const lines = computed(() => formatConsoleLines(props.output))
</script>

<template>
  <PanelCard
    title="Console"
    info="Observable Output so far: console lines, uncaught exceptions and unhandled rejections."
    :count="lines.length"
    content-class="overflow-auto max-h-72"
  >
    <p v-if="lines.length === 0" class="text-muted-foreground py-2 text-center text-xs">
      No console output at this step.
    </p>
    <TransitionGroup tag="ul" name="queue-item" data-testid="console-panel" class="relative flex flex-col font-mono text-xs">
      <li
        v-for="(line, i) in lines"
        :key="i"
        :class="
          cn(
            'border-b py-1 whitespace-pre-wrap last:border-b-0',
            line.kind === 'error' && 'text-destructive console-error',
          )
        "
      >
        {{ line.text }}
      </li>
    </TransitionGroup>
  </PanelCard>
</template>
