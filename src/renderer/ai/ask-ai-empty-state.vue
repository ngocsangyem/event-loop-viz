<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

/**
 * Shown before the first question. Without a key it asks for one; with a key it says what the AI
 * reads and offers questions to start with, the whole-Run walkthrough first.
 */
defineProps<{ hasKey: boolean }>()
const emit = defineEmits<{ pick: [question: string]; connect: [] }>()
const { t } = useI18n()
const SUGGESTIONS = ['walkThrough', 'whyOrder', 'microtasks', 'explainStep'] as const
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col items-start gap-4 overflow-y-auto p-4">
    <div class="flex flex-col gap-1.5">
      <h3 class="text-foreground text-[15px] leading-6 font-medium lowercase">{{ hasKey ? t('ai.empty.title') : t('ai.empty.noKeyTitle') }}</h3>
      <p class="text-foreground-2 text-sm leading-[22px]">{{ hasKey ? t('ai.empty.hint') : t('ai.empty.noKeyHint') }}</p>
    </div>
    <Button v-if="!hasKey" size="lg" class="max-sm:h-12!" data-autofocus data-testid="ask-ai-connect" @click="emit('connect')">
      {{ t('ai.empty.connect') }}
    </Button>
    <ul v-else class="flex w-full flex-col" :aria-label="t('ai.suggestions.label')">
      <li v-for="id in SUGGESTIONS" :key="id">
        <!-- Sentences, not labels: sentence case and wrapping, with the prompt glyph in front. -->
        <Button
          variant="secondary"
          class="h-auto min-h-9 w-full justify-start gap-2 py-2 text-left font-normal tracking-normal whitespace-normal normal-case max-sm:min-h-11"
          data-testid="ask-ai-suggestion"
          @click="emit('pick', t(`ai.suggestions.${id}`))"
        >
          <span class="text-brand" aria-hidden="true">❯</span>
          {{ t(`ai.suggestions.${id}`) }}
        </Button>
      </li>
    </ul>
  </div>
</template>
