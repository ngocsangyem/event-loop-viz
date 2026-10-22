<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { AskAiError, ERROR_KEYS } from '../ai/openrouter-error'
import { DriveNeedsKeyError } from './drive-ai-steps'
import { DriveAiFormatError } from './parse-drive-ai-steps'

/**
 * The body of the Drive me card when the steps could not be made: why, in plain words, and what
 * to do (connect a key, open settings, try again). The card's own END is always there too.
 */
const props = defineProps<{ error: unknown }>()
const emit = defineEmits<{ retry: []; settings: [] }>()
const { t } = useI18n()

const needsKey = computed(() => props.error instanceof DriveNeedsKeyError)
const provider = computed(() => (props.error instanceof AskAiError ? props.error : null))
const message = computed(() => {
  if (needsKey.value) return t('drive.ai.keyBody')
  if (provider.value) return t(`ai.errors.${ERROR_KEYS[provider.value.kind]}`)
  if (props.error instanceof DriveAiFormatError) return t('drive.ai.formatBody')
  return t('drive.errorBody')
})
const showSettings = computed(
  () => !needsKey.value && (provider.value?.kind === 'invalid-key' || provider.value?.kind === 'model-not-found' || props.error instanceof DriveAiFormatError),
)
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="drive-notice">
    <p>{{ message }}</p>
    <div class="flex gap-2">
      <Button v-if="needsKey" size="sm" class="max-sm:h-11!" @click="emit('settings')">{{ t('drive.ai.connect') }}</Button>
      <template v-else>
        <Button variant="secondary" size="sm" class="max-sm:h-11!" data-testid="drive-retry" @click="emit('retry')">{{ t('drive.ai.retry') }}</Button>
        <Button v-if="showSettings" variant="ghost" size="sm" class="max-sm:h-11!" @click="emit('settings')">{{ t('ai.settings') }}</Button>
      </template>
    </div>
  </div>
</template>
