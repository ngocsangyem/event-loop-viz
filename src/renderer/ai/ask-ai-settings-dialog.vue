<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogClose, DialogCloseText, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import AskAiSettings from './ask-ai-settings.vue'
import type { ApiKeyStore } from './api-key-store'
import type { ModelInfo } from './openrouter-models'

/**
 * Ask AI settings in a modal. Edits are a local draft: SAVE writes the key, "remember" and the
 * model; CANCEL, Esc and closing drop them. REMOVE KEY is the one immediate action, since it
 * only erases what is already stored. The dialog has no trigger to return focus to, so the
 * panel puts focus back itself when it closes.
 */
const open = defineModel<boolean>('open', { required: true })
const model = defineModel<string>('model', { required: true })
const props = defineProps<{
  store: ApiKeyStore
  models: readonly ModelInfo[]
  modelStatus: 'loading' | 'ready' | 'error'
  /** OpenRouter rejected the saved key. */
  keyRejected: boolean
}>()
const emit = defineEmits<{ saved: []; retryModels: [] }>()
const { t } = useI18n()

const draftKey = shallowRef('')
const draftRemember = shallowRef(false)
const draftModel = shallowRef('')
const reveal = shallowRef(false)

// Every opening starts from what is stored, so a cancelled edit never lingers.
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    draftKey.value = props.store.key.value
    draftRemember.value = props.store.remember.value
    draftModel.value = model.value
    reveal.value = false
  },
  { immediate: true },
)

function save() {
  // Remember first, so the key is written to (or kept out of) storage as chosen.
  props.store.setRemember(draftRemember.value)
  props.store.setKey(draftKey.value)
  if (draftModel.value) model.value = draftModel.value
  emit('saved')
  open.value = false
}

function removeKey() {
  props.store.forget()
  draftKey.value = ''
  draftRemember.value = false
}

/** The dialog opens on the key field, the one thing that must be filled. */
function focusKey(event: Event) {
  const key = document.querySelector<HTMLElement>('[data-testid="ask-ai-settings-dialog"] [data-autofocus]')
  if (!key) return
  event.preventDefault()
  key.focus()
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="false"
      data-testid="ask-ai-settings-dialog"
      @open-auto-focus="focusKey"
      @close-auto-focus.prevent
    >
      <DialogHeader>
        <DialogTitle>{{ t('ai.settingsTitle') }}</DialogTitle>
      </DialogHeader>
      <DialogCloseText :label="t('ai.close')" />
      <AskAiSettings
        v-model:api-key="draftKey"
        v-model:remember="draftRemember"
        v-model:model="draftModel"
        v-model:reveal="reveal"
        :models="models"
        :model-status="modelStatus"
        :key-rejected="keyRejected && draftKey === store.key.value"
        @retry-models="emit('retryModels')"
        @submit="draftKey.trim() !== '' && save()"
      />
      <DialogFooter>
        <Button
          variant="secondary"
          class="text-error hover:bg-error-soft"
          :disabled="!store.key.value && !draftKey"
          data-testid="ask-ai-forget"
          @click="removeKey"
        >
          {{ t('ai.key.forget') }}
        </Button>
        <span class="flex-1" />
        <DialogClose as-child>
          <Button variant="outline" data-testid="ask-ai-cancel">{{ t('ai.key.cancel') }}</Button>
        </DialogClose>
        <Button hotkey="↵" :disabled="draftKey.trim() === ''" data-testid="ask-ai-done" @click="save">
          {{ t('ai.key.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
