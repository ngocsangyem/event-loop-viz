<script setup lang="ts">
import AskAiSettingsDialog from '../ai/ask-ai-settings-dialog.vue'
import { sharedApiKeyStore } from '../ai/shared-api-key-store'
import { useOpenRouterModelChoice } from '../ai/use-openrouter-model-choice'

/**
 * The Ask AI settings dialog, opened from Drive me. Same key store and remembered model as Ask
 * AI, so connecting here also connects Ask AI. Mounted only when needed: it loads the model list.
 */
defineProps<{ keyRejected: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()
const store = sharedApiKeyStore()
const { model, models, status, fetchModels } = useOpenRouterModelChoice()
</script>

<template>
  <AskAiSettingsDialog
    v-model:open="open"
    v-model:model="model"
    :store="store"
    :models="models"
    :model-status="status"
    :key-rejected="keyRejected"
    @saved="emit('saved')"
    @retry-models="fetchModels"
  />
</template>
