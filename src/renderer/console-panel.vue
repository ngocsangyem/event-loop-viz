<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { consoleRowsOf } from './console-lines'
import type { ConsoleRow } from './console-lines'
import type { ObservableOutput } from '../trace/observable-output'
import { cn } from '@/lib/utils'
import PanelCard from './panels/panel-card.vue'
import { STEP_FOCUS_KEY } from './panels/step-focus-keys'

/**
 * The Observable Output so far, one row per line: a tag (LOG INF WRN ERR REJ), the text, and where
 * it was printed (`L3 · Job #1`, from `meta`, one entry per output line). The line the current
 * step printed is marked as the newest.
 */
const props = defineProps<{ output: ObservableOutput; meta?: readonly (string | null)[] }>()
const { t } = useI18n()
const lines = computed(() => consoleRowsOf(props.output, props.meta))

const focus = inject(STEP_FOCUS_KEY, null)
const isNewest = (i: number) => !!focus?.value.changed.has('console') && i === lines.value.length - 1

const TAG_TONE: Record<ConsoleRow['tone'], string> = {
  log: 'text-muted-foreground',
  info: 'text-foreground-2',
  warn: 'text-warn',
  error: 'text-error',
}
const ROW_TINT: Partial<Record<ConsoleRow['tone'], string>> = { warn: 'bg-warn-soft', error: 'bg-error-soft' }
const PREFIX_KEY = {
  uncaught: 'console.uncaught',
  'unhandled-rejection': 'console.unhandledRejection',
  'rejection-handled': 'console.rejectionHandled',
} as const

const rowClass = (line: ConsoleRow, newest: boolean) =>
  cn(
    'grid grid-cols-[36px_minmax(0,1fr)_auto] gap-2 px-4',
    ROW_TINT[line.tone],
    line.ruled && 'shadow-[inset_2px_0_0_var(--error)]',
    // The newest line outranks the tint: the eye should land on what this step printed.
    newest && 'bg-console-soft shadow-[inset_2px_0_0_var(--console)]',
  )
</script>

<template>
  <PanelCard
    data-drive-target="console"
    concept="console"
    :title="t('console.title')"
    :info="t('console.info')"
    :count="output.length"
    class="h-[178px]"
    content-class="gap-0 overflow-auto px-0 pb-0"
  >
    <p v-if="lines.length === 0" class="text-muted-foreground px-4 text-[12.5px] leading-[22px]">
      {{ t('console.empty') }}
    </p>
    <TransitionGroup tag="ul" name="queue-item" data-testid="console-panel" class="relative flex flex-col font-mono text-[12.5px] leading-[22px]">
      <li v-for="(line, i) in lines" :key="i" :class="rowClass(line, isNewest(i))" :data-tone="line.tone">
        <span :class="cn('text-[11px] leading-[22px] font-medium tracking-(--tracking-label)', TAG_TONE[line.tone])">{{ line.tag }}</span>
        <span :class="cn('min-w-0 break-words whitespace-pre-wrap', line.tone === 'error' ? 'text-error' : 'text-foreground-2')">
          <span v-if="line.prefix" class="text-error">{{ t(PREFIX_KEY[line.prefix]) }}</span>{{ line.text }}<span v-if="line.count > 1" class="text-muted-foreground ml-2.5 select-none" :title="t('console.repeated', { count: line.count })">×{{ line.count }}</span>
        </span>
        <span class="text-muted-foreground text-[11px] leading-[22px] whitespace-nowrap uppercase">{{ line.meta }}</span>
      </li>
    </TransitionGroup>
  </PanelCard>
</template>
