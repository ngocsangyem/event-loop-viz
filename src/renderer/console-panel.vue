<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatConsoleLines } from './console-lines'
import type { ObservableOutput } from '../trace/observable-output'
import { cn } from '@/lib/utils'
import PanelCard from './panels/panel-card.vue'

const props = defineProps<{ output: ObservableOutput }>()
const { t } = useI18n()
const lines = computed(() => formatConsoleLines(props.output))
</script>

<template>
  <PanelCard
    concept="console"
    :title="t('console.title')"
    :info="t('console.info')"
    :count="lines.length"
    content-class="overflow-auto max-h-72"
  >
    <p v-if="lines.length === 0" class="meta-mono py-2 text-center">
      {{ t('console.empty') }}
    </p>
    <TransitionGroup tag="ul" name="queue-item" data-testid="console-panel" class="relative flex flex-col font-mono text-[12.5px] leading-[22px]">
      <li
        v-for="(line, i) in lines"
        :key="i"
        :class="
          cn(
            'border-border-soft text-foreground-2 border-b px-2 whitespace-pre-wrap last:border-b-0',
            line.kind === 'error' && 'text-destructive console-error bg-error-soft shadow-[inset_2px_0_0_var(--error)]',
          )
        "
      >
        {{ line.text }}
      </li>
    </TransitionGroup>
  </PanelCard>
</template>
