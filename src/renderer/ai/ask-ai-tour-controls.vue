<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { TourStop } from './tour-answer-parser'

/**
 * Previous / Next for a started tour, with "2 / 6" and the current stop's title. Docked above the
 * question box in the panel; `floating` is the small card beside the launcher when the panel is
 * minimized, so the tour goes on while the whole visualizer is in view.
 */
const props = defineProps<{ stops: readonly TourStop[]; index: number; floating?: boolean }>()
const emit = defineEmits<{ next: []; prev: [] }>()
const { t } = useI18n()

const title = computed(() => props.stops[props.index]?.title ?? '')
const percent = computed(() => ((props.index + 1) / props.stops.length) * 100)
</script>

<template>
  <section
    :aria-label="t('ai.tour.region')"
    :class="[
      'bg-popover text-popover-foreground flex min-w-0 flex-col gap-2',
      floating ? 'bg-raised w-72 max-w-[calc(100vw-6rem)] border p-2.5' : 'border-t px-3 pt-2.5 pb-1',
    ]"
    data-testid="ask-ai-tour"
  >
    <div class="flex min-w-0 items-center gap-2 text-xs">
      <span class="label-mono text-brand-text shrink-0 tabular-nums" data-testid="ask-ai-tour-progress">
        {{ t('ai.tour.progress', { current: index + 1, total: stops.length }) }}
      </span>
      <span class="truncate font-medium" :title="title">{{ title }}</span>
    </div>
    <div class="bg-border-soft h-1 overflow-hidden" aria-hidden="true">
      <div class="bg-brand h-full transition-[width] duration-300 motion-reduce:transition-none" :style="{ width: `${percent}%` }" />
    </div>
    <div class="flex items-center justify-between gap-2">
      <Button size="sm" variant="ghost" :disabled="index === 0" data-testid="ask-ai-tour-prev" @click="emit('prev')">
        <ChevronLeftIcon />
        {{ t('ai.tour.prev') }}
      </Button>
      <Button size="sm" :disabled="index === stops.length - 1" data-testid="ask-ai-tour-next" @click="emit('next')">
        {{ t('ai.tour.next') }}
        <ChevronRightIcon />
      </Button>
    </div>
  </section>
</template>
