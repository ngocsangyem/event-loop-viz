<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import AskAiWordButton from './ask-ai-word-button.vue'
import { ERROR_KEYS } from './openrouter-error'
import type { AskAiErrorKind } from './openrouter-error'

/** A failed request: `⚠ OPENROUTER 401`, the cause in plain words, and RETRY / SETTINGS / DISMISS words. */
defineProps<{ error: { kind: AskAiErrorKind; detail?: string } }>()
const emit = defineEmits<{ retry: []; settings: []; dismiss: [] }>()
const { t } = useI18n()

</script>

<template>
  <Alert tone="error" class="mx-4 mb-3 w-auto shrink-0" data-testid="ask-ai-error">
    <AlertTitle>{{ t(`ai.errors.title.${ERROR_KEYS[error.kind]}`) }}</AlertTitle>
    <AlertDescription class="flex flex-col gap-2">
      <span>{{ t(`ai.errors.${ERROR_KEYS[error.kind]}`) }}</span>
      <span v-if="error.kind === 'unknown' && error.detail" class="font-mono text-xs">
        {{ t('ai.errors.detail', { detail: error.detail }) }}
      </span>
      <span class="flex gap-4">
        <AskAiWordButton data-testid="ask-ai-retry" @click="emit('retry')">{{ t('ai.errors.retry') }}</AskAiWordButton>
        <AskAiWordButton v-if="error.kind === 'invalid-key' || error.kind === 'model-not-found'" @click="emit('settings')">
          {{ t('ai.settings') }}
        </AskAiWordButton>
        <AskAiWordButton @click="emit('dismiss')">{{ t('ai.errors.dismiss') }}</AskAiWordButton>
      </span>
    </AlertDescription>
  </Alert>
</template>
