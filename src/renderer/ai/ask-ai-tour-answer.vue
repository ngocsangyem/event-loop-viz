<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import AskAiMarkdown from './ask-ai-markdown.vue'
import AskAiWordButton from './ask-ai-word-button.vue'
import type { TourAnswer } from './tour-answer-parser'

/**
 * One AI answer laid out as a tour: the big picture, then numbered stops (`01 ✓ title`; each one
 * a button that moves the replay to its event), then the interview one-liner and a START GUIDED
 * TOUR word. `active` is the stop the replay shows; `done` is false while the answer still arrives.
 */
defineProps<{ answer: TourAnswer; active: number; done: boolean; stepOf: (seq: number) => number }>()
const emit = defineEmits<{ go: [index: number] }>()
const { t } = useI18n()
const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <div class="flex flex-col gap-4">
    <AskAiMarkdown v-if="answer.intro" :text="answer.intro" />
    <ol v-if="answer.stops.length > 0" class="flex flex-col gap-1">
      <li
        v-for="(stop, i) in answer.stops"
        :key="i"
        :aria-current="i === active ? 'step' : undefined"
        :class="['flex flex-col gap-1 py-1.5 pr-2 pl-3', i === active && 'bg-accent shadow-[inset_2px_0_0_var(--brand)]']"
        :data-active="i === active ? 'true' : 'false'"
        :data-seq="stop.seq"
        data-testid="ask-ai-tour-stop"
      >
        <div class="flex items-baseline gap-3">
          <span :class="['font-mono text-[11px] tabular-nums', i === active ? 'text-brand-text' : 'text-muted-foreground']">
            {{ pad(i + 1) }}<span v-if="i < active" aria-hidden="true"> ✓</span><span v-if="i < active" class="sr-only"> {{ t('ai.tour.visited') }}</span>
          </span>
          <span class="text-foreground min-w-0 flex-1 text-sm leading-[22px] font-medium">{{ stop.title }}</span>
        </div>
        <AskAiMarkdown v-if="stop.body" :text="stop.body" class="pl-8" />
        <AskAiWordButton class="ml-8 self-start" @click="emit('go', i)">
          {{ t('ai.tour.jump', { step: stepOf(stop.seq) }) }}
        </AskAiWordButton>
      </li>
    </ol>
    <!-- The recap: the rule in one line and what to say about it in an interview. -->
    <Alert v-if="answer.outro" tone="success" data-testid="ask-ai-recap">
      <AlertTitle>{{ t('ai.tour.oneLiner') }}</AlertTitle>
      <AlertDescription><AskAiMarkdown :text="answer.outro" /></AlertDescription>
    </Alert>
    <div v-if="done && answer.stops.length > 0" class="flex flex-col items-start gap-1">
      <span class="text-muted-foreground font-mono text-[11px] leading-[14px]">{{ t('ai.tour.ready', { total: answer.stops.length }) }}</span>
      <!-- One word whose label changes, so keyboard focus stays on it once the tour starts. -->
      <AskAiWordButton data-testid="ask-ai-tour-start" @click="emit('go', 0)">
        {{ active === -1 ? t('ai.tour.start') : t('ai.tour.restart') }}
      </AskAiWordButton>
    </div>
  </div>
</template>
