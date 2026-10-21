<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AskAiTourAnswer from './ask-ai-tour-answer.vue'
import type { TourAnswer } from './tour-answer-parser'
import type { ConversationMessage } from './use-ask-ai'

/** The conversation: your questions on the right, the AI's answers (laid out as tours) on the left. */
const props = defineProps<{
  messages: readonly ConversationMessage[]
  streaming: boolean
  answers: ReadonlyMap<number, TourAnswer>
  /** The answer the tour walks and its current stop. */
  tour: { messageId: number | null; index: number }
}>()
const emit = defineEmits<{ go: [messageId: number, index: number] }>()
const { t } = useI18n()
const scroller = useTemplateRef('scroller')

// The current stop scrolls into view as the tour moves.
watch(
  () => [props.tour.messageId, props.tour.index],
  async () => {
    await nextTick()
    scroller.value?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest' })
  },
)

// Follow the stream to the bottom as text arrives.
watch(
  () => [props.messages.length, props.messages.at(-1)?.content.length],
  async () => {
    await nextTick()
    const el = scroller.value
    if (el) el.scrollTop = el.scrollHeight
  },
)
</script>

<template>
  <div
    ref="scroller"
    role="region"
    tabindex="0"
    :aria-label="t('ai.conversation')"
    class="focus-visible:ring-ring/50 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-2 outline-none focus-visible:ring-3"
    data-testid="ask-ai-messages"
  >
    <template v-for="(message, i) in messages" :key="message.id">
      <div v-if="message.role === 'user'" class="flex justify-end" data-testid="ask-ai-user-message">
        <p class="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 break-words whitespace-pre-wrap">
          <span class="sr-only">{{ t('ai.you') }}: </span>{{ message.content }}
        </p>
      </div>
      <div v-else class="max-w-[95%]" data-testid="ask-ai-answer">
        <span class="sr-only">{{ t('ai.assistant') }}: </span>
        <AskAiTourAnswer
          v-if="message.content && answers.get(message.id)"
          :answer="answers.get(message.id)!"
          :active="tour.messageId === message.id ? tour.index : -1"
          @go="emit('go', message.id, $event)"
        />
        <span v-else class="text-muted-foreground">{{ t('ai.thinking') }}</span>
        <span
          v-if="streaming && i === messages.length - 1"
          class="bg-foreground ml-0.5 inline-block h-4 w-1.5 animate-pulse align-text-bottom motion-reduce:animate-none"
          aria-hidden="true"
        />
      </div>
    </template>
  </div>
</template>
