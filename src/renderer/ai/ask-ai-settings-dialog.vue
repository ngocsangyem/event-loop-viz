<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { XIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AskAiSettings from './ask-ai-settings.vue'
import type { ApiKeyStore } from './api-key-store'
import type { ModelInfo } from './openrouter-models'

/**
 * Ask AI settings in a modal: the key, where it is kept, and the model. The dialog has no trigger
 * to return focus to, so the panel puts focus back itself when it closes.
 */
const open = defineModel<boolean>('open', { required: true })
defineProps<{
  store: ApiKeyStore
  models: readonly ModelInfo[]
  modelStatus: 'loading' | 'ready' | 'error'
}>()
const model = defineModel<string>('model', { required: true })
const emit = defineEmits<{ done: []; retryModels: [] }>()
const { t } = useI18n()

/** The dialog opens on the key field, the one thing that must be filled. */
function focusKey(event: Event) {
  const key = document.getElementById('ask-ai-key')
  if (!key) return
  event.preventDefault()
  key.focus()
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="false"
      class="sm:max-w-md"
      data-testid="ask-ai-settings-dialog"
      @open-auto-focus="focusKey"
      @close-auto-focus.prevent
    >
      <DialogHeader>
        <DialogTitle>{{ t('ai.settings') }}</DialogTitle>
        <DialogDescription>{{ t('ai.settingsDescription') }}</DialogDescription>
      </DialogHeader>
      <AskAiSettings
        v-model:model="model"
        :store="store"
        :models="models"
        :model-status="modelStatus"
        @done="emit('done')"
        @retry-models="emit('retryModels')"
      />
      <DialogClose as-child>
        <Button variant="ghost" size="icon-sm" class="absolute top-2 right-2" :aria-label="t('ai.close')">
          <XIcon />
        </Button>
      </DialogClose>
    </DialogContent>
  </Dialog>
</template>
