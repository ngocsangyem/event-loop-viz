<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SparklesIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'

/** Shown before the first question: what the AI reads, and questions to start with. */
const emit = defineEmits<{ pick: [question: string] }>()
const { t } = useI18n()
const SUGGESTIONS = ['explainStep', 'whyBefore', 'whatNext', 'explainScript'] as const
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
    <SparklesIcon class="text-muted-foreground size-6" aria-hidden="true" />
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-medium">{{ t('ai.empty.title') }}</h3>
      <p class="text-muted-foreground text-xs">{{ t('ai.empty.hint') }}</p>
    </div>
    <ul class="flex flex-wrap justify-center gap-2" :aria-label="t('ai.suggestions.label')">
      <li v-for="id in SUGGESTIONS" :key="id">
        <Button
          variant="outline"
          size="sm"
          class="h-auto rounded-full py-1 whitespace-normal"
          data-testid="ask-ai-suggestion"
          @click="emit('pick', t(`ai.suggestions.${id}`))"
        >
          {{ t(`ai.suggestions.${id}`) }}
        </Button>
      </li>
    </ul>
  </div>
</template>
