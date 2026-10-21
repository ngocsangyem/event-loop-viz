<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RotateCcwIcon } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { AskAiErrorKind } from './openrouter-error'

/** A failed request in plain words, with Retry and, for key or model problems, a way to Settings. */
defineProps<{ error: { kind: AskAiErrorKind; detail?: string } }>()
const emit = defineEmits<{ retry: []; settings: []; dismiss: [] }>()
const { t } = useI18n()

const ERROR_KEYS = {
  'invalid-key': 'invalidKey',
  'no-credits': 'noCredits',
  'rate-limited': 'rateLimited',
  'model-not-found': 'modelNotFound',
  network: 'network',
  empty: 'empty',
  unknown: 'unknown',
} as const
</script>

<template>
  <Alert variant="destructive" class="mx-3 mb-2 w-auto" role="alert" data-testid="ask-ai-error">
    <AlertDescription class="flex flex-col gap-2">
      <span>{{ t(`ai.errors.${ERROR_KEYS[error.kind]}`) }}</span>
      <span v-if="error.kind === 'unknown' && error.detail" class="text-xs">
        {{ t('ai.errors.detail', { detail: error.detail }) }}
      </span>
      <span class="flex gap-2">
        <Button size="xs" variant="outline" data-testid="ask-ai-retry" @click="emit('retry')">
          <RotateCcwIcon />
          {{ t('ai.errors.retry') }}
        </Button>
        <Button v-if="error.kind === 'invalid-key' || error.kind === 'model-not-found'" size="xs" variant="outline" @click="emit('settings')">
          {{ t('ai.settings') }}
        </Button>
        <Button size="xs" variant="ghost" @click="emit('dismiss')">{{ t('ai.errors.dismiss') }}</Button>
      </span>
    </AlertDescription>
  </Alert>
</template>
