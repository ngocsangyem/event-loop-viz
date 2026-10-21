<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { TourStop } from './tour-answer-parser'

/**
 * The stop card of a started tour (`STOP 03 OF 07 · STEP 15`, the stop's title) with [P]PREV and
 * [N]NEXT STOP. Docked above the prompt in the panel; `floating` is the one-row tour segment in
 * the dock when the panel is minimized, so the tour goes on while the whole visualizer is in view.
 */
const props = defineProps<{
  stops: readonly TourStop[]
  index: number
  floating?: boolean
  stepOf: (seq: number) => number
}>()
const emit = defineEmits<{ next: []; prev: [] }>()
const { t } = useI18n()

const pad = (n: number) => String(n).padStart(2, '0')
const title = computed(() => props.stops[props.index]?.title ?? '')
const progress = computed(() => {
  const current = pad(props.index + 1)
  const total = pad(props.stops.length)
  return props.floating
    ? t('ai.tour.progressFloating', { current, total })
    : t('ai.tour.progress', { current, total, step: props.stepOf(props.stops[props.index]?.seq ?? 0) })
})
</script>

<template>
  <section
    :aria-label="t('ai.tour.region')"
    :class="[
      'text-popover-foreground flex min-w-0',
      floating ? 'bg-raised border-border-soft items-center gap-3 border px-3 py-1' : 'border-border flex-col gap-2 border-t px-4 py-3',
    ]"
    data-testid="ask-ai-tour"
  >
    <template v-if="floating">
      <span class="text-brand-text shrink-0 font-mono text-xs font-medium tracking-[0.02em] uppercase tabular-nums" data-testid="ask-ai-tour-progress">{{ progress }}</span>
      <span class="max-w-56 truncate text-sm lowercase max-lg:sr-only" :title="title">{{ title }}</span>
    </template>
    <Alert v-else tone="prompt">
      <AlertTitle><span data-testid="ask-ai-tour-progress">{{ progress }}</span></AlertTitle>
      <AlertDescription class="text-foreground text-sm lowercase" :title="title">{{ title }}</AlertDescription>
    </Alert>
    <div class="flex items-center justify-between gap-2">
      <Button variant="secondary" size="sm" hotkey="P" class="max-sm:h-11!" :disabled="index === 0" data-testid="ask-ai-tour-prev" @click="emit('prev')">
        {{ t('ai.tour.prev') }}
      </Button>
      <Button size="sm" hotkey="N" class="max-sm:h-11!" :disabled="index === stops.length - 1" data-testid="ask-ai-tour-next" @click="emit('next')">
        {{ t('ai.tour.next') }}
      </Button>
    </div>
  </section>
</template>
