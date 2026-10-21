<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AskAiMarkdown from './ask-ai-markdown.vue'
import type { TourAnswer } from './tour-answer-parser'

/**
 * One AI answer laid out as a tour: the big picture, then numbered stops (each one a button that
 * moves the replay to its event), then the closing line. `active` is the stop the replay shows.
 */
defineProps<{ answer: TourAnswer; active: number }>()
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
          i === active ? 'border-primary bg-primary/5' : 'border-transparent',
        ]"
        :data-active="i === active ? 'true' : 'false'"
        data-testid="ask-ai-tour-stop"
      >
        <button
          type="button"
          class="focus-visible:ring-ring/50 hover:bg-muted/60 -m-1 flex items-center gap-2.5 rounded-md p-1 text-left outline-none focus-visible:ring-3"
          @click="emit('go', i)"
        >
          <span
            :class="[
              'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular-nums',
              i === active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            ]"
          >{{ i + 1 }}<span class="sr-only">.</span></span>
          <span class="min-w-0 flex-1 font-medium">{{ stop.title }}</span>
          <span class="text-muted-foreground shrink-0 font-mono text-xs" aria-hidden="true">#{{ stop.seq }}</span>
          <span class="sr-only">{{ t('ai.tour.goTo', { seq: stop.seq }) }}</span>
        </button>
        <AskAiMarkdown v-if="stop.body" :text="stop.body" class="pl-7.5" />
      </li>
    </ol>
    <AskAiMarkdown v-if="answer.outro" :text="answer.outro" />
  </div>
</template>
