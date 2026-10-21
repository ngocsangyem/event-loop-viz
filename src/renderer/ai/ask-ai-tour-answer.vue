<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PlayIcon, RotateCcwIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import AskAiMarkdown from './ask-ai-markdown.vue'
import type { TourAnswer } from './tour-answer-parser'

/**
 * One AI answer laid out as a tour: the big picture, then numbered stops (each one a button that
 * moves the replay to its event), then the closing line and a Start button for the guided tour.
 * `active` is the stop the replay shows; `done` is false while the answer is still arriving.
 */
defineProps<{ answer: TourAnswer; active: number; done: boolean }>()
const emit = defineEmits<{ go: [index: number] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3">
    <AskAiMarkdown v-if="answer.intro" :text="answer.intro" />
    <ol v-if="answer.stops.length > 0" class="flex flex-col gap-1.5">
      <li
        v-for="(stop, i) in answer.stops"
        :key="i"
        :aria-current="i === active ? 'step' : undefined"
        :class="[
          'flex flex-col gap-1 rounded-lg border p-2 transition-colors motion-reduce:transition-none',
          i === active ? 'border-transparent bg-accent shadow-[inset_2px_0_0_var(--brand)]' : 'border-transparent',
        ]"
        :data-active="i === active ? 'true' : 'false'"
        :data-seq="stop.seq"
        data-testid="ask-ai-tour-stop"
      >
        <button
          type="button"
          class="focus-visible:ring-ring/50 hover:bg-muted/60 -m-1 flex items-center gap-2.5 rounded-md p-1 text-left outline-none focus-visible:ring-3"
          @click="emit('go', i)"
        >
          <span
            :class="[
              'flex h-5 min-w-5 shrink-0 items-center justify-center font-mono text-[11px] font-medium tabular-nums',
              i === active ? 'text-brand-text' : 'text-muted-foreground',
            ]"
          >{{ i + 1 }}<span class="sr-only">.</span></span>
          <span class="min-w-0 flex-1 font-medium">{{ stop.title }}</span>
          <span class="sr-only">{{ t('ai.tour.goTo') }}</span>
        </button>
        <AskAiMarkdown v-if="stop.body" :text="stop.body" class="pl-7.5" />
      </li>
    </ol>
    <!-- The recap: the rule in one line and what to say about it in an interview. -->
    <AskAiMarkdown v-if="answer.outro" :text="answer.outro" class="bg-raised border-l-console border-l-2 p-2.5" data-testid="ask-ai-recap" />
    <div v-if="done && answer.stops.length > 0" class="bg-raised flex items-center justify-between gap-3 border p-2.5">
      <span class="text-muted-foreground text-xs">{{ t('ai.tour.ready', { total: answer.stops.length }) }}</span>
      <!-- One button whose label changes, so keyboard focus stays on it once the tour starts. -->
      <Button size="sm" :variant="active === -1 ? 'default' : 'outline'" data-testid="ask-ai-tour-start" @click="emit('go', 0)">
        <PlayIcon v-if="active === -1" />
        <RotateCcwIcon v-else />
        {{ active === -1 ? t('ai.tour.start') : t('ai.tour.restart') }}
      </Button>
    </div>
  </div>
</template>
