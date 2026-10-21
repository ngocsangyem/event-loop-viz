<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { TourStop } from './tour-answer-parser'

/**
 * Previous / Next for the tour, with "2 / 6" and the current stop's title. Docked above the
 * question box in the panel; `floating` is the small card beside the launcher when the panel is
 * minimized, so the tour goes on while the whole visualizer is in view.
 */
const props = defineProps<{ stops: readonly TourStop[]; index: number; floating?: boolean }>()
const emit = defineEmits<{ next: []; prev: [] }>()
const { t } = useI18n()

const started = computed(() => props.index >= 0)
const title = computed(() => props.stops[props.index]?.title ?? '')
const percent = computed(() => (started.value ? ((props.index + 1) / props.stops.length) * 100 : 0))
</script>

<template>
  <section
    :aria-label="t('ai.tour.region')"
    :class="[
      'bg-popover text-popover-foreground flex min-w-0 flex-col gap-2',
      floating ? 'w-72 max-w-[calc(100vw-6rem)] rounded-xl border p-2.5 shadow-lg' : 'border-t px-3 pt-2.5 pb-1',
    ]"
    data-testid="ask-ai-tour"
  >
    <div class="flex min-w-0 items-center gap-2 text-xs">
      <span class="text-primary shrink-0 font-mono font-medium tabular-nums" data-testid="ask-ai-tour-progress">
        {{ started ? t('ai.tour.progress', { current: index + 1, total: stops.length }) : t('ai.tour.stops', { total: stops.length }) }}
      </span>
      <span v-if="started" class="truncate font-medium" :title="title">{{ title }}</span>
    </div>
    <div class="bg-muted h-1 overflow-hidden rounded-full" aria-hidden="true">
      <div class="bg-primary h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none" :style="{ width: `${percent}%` }" />
    </div>
    <div class="flex items-center justify-between gap-2">
      <Button size="sm" variant="ghost" :disabled="!started || index === 0" data-testid="ask-ai-tour-prev" @click="emit('prev')">
        <ChevronLeftIcon />
        {{ t('ai.tour.prev') }}
      </Button>
      <Button size="sm" :disabled="started && index === stops.length - 1" data-testid="ask-ai-tour-next" @click="emit('next')">
        <template v-if="started">
          {{ t('ai.tour.next') }}
          <ChevronRightIcon />
        </template>
        <template v-else>
          <PlayIcon />
          {{ t('ai.tour.start') }}
        </template>
      </Button>
    </div>
  </section>
</template>
