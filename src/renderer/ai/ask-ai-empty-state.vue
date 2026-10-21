<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { KeyRoundIcon, SparklesIcon } from '@lucide/vue'
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
  <div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
    <span class="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full" aria-hidden="true">
      <SparklesIcon v-if="hasKey" class="size-5" />
      <KeyRoundIcon v-else class="size-5" />
    </span>
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-medium">{{ hasKey ? t('ai.empty.title') : t('ai.empty.noKeyTitle') }}</h3>
      <p class="text-muted-foreground text-xs">{{ hasKey ? t('ai.empty.hint') : t('ai.empty.noKeyHint') }}</p>
    </div>
    <Button v-if="!hasKey" size="sm" data-autofocus data-testid="ask-ai-connect" @click="emit('connect')">
      <KeyRoundIcon />
      {{ t('ai.empty.connect') }}
    </Button>
    <ul v-else class="flex flex-wrap justify-center gap-2" :aria-label="t('ai.suggestions.label')">
      <li v-for="id in SUGGESTIONS" :key="id">
        <Button
          :variant="id === 'walkThrough' ? 'default' : 'outline'"
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
