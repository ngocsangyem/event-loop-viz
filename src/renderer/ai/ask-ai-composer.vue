<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { SendIcon, SquareIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import AskAiModelPicker from './ask-ai-model-picker.vue'
import type { ModelInfo } from './openrouter-models'

/** The footer: question box, the model button, Send / Stop and the fine print. */
const props = defineProps<{
  streaming: boolean
  models: readonly ModelInfo[]
  modelStatus: 'loading' | 'ready' | 'error'
}>()
const model = defineModel<string>('model', { required: true })
const emit = defineEmits<{ send: [text: string]; stop: []; retryModels: [] }>()

const { t } = useI18n()
const draft = shallowRef('')
const box = useTemplateRef('box')

function submit() {
  const text = draft.value.trim()
  if (text === '') return
  emit('send', text)
  draft.value = ''
}

function onKeydown(event: KeyboardEvent) {
  // Enter sends; Shift+Enter adds a line; Enter while an IME is composing belongs to the IME.
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  if (!model.value) return
  if (!props.streaming) submit()
}

defineExpose({ focus: () => (box.value?.$el as HTMLElement | undefined)?.focus() })
</script>

<template>
  <form class="flex flex-col gap-2 border-t p-3" @submit.prevent="submit">
    <Textarea
      ref="box"
      v-model="draft"
      :aria-label="t('ai.input.label')"
      :placeholder="t('ai.input.placeholder')"
      rows="2"
      class="max-h-40 min-h-16 resize-none"
      data-autofocus
      data-testid="ask-ai-input"
      @keydown="onKeydown"
    />
    <div class="flex items-center justify-between gap-2">
      <AskAiModelPicker v-model="model" :models="models" :status="modelStatus" compact @retry="emit('retryModels')" />
      <Button v-if="streaming" type="button" size="sm" variant="outline" data-testid="ask-ai-stop" @click="emit('stop')">
        <SquareIcon />
        {{ t('ai.input.stop') }}
      </Button>
      <Button v-else type="submit" size="sm" :disabled="draft.trim() === '' || !model" data-testid="ask-ai-send">
        <SendIcon />
        {{ t('ai.input.send') }}
      </Button>
    </div>
    <p class="text-muted-foreground text-xs">{{ t('ai.input.finePrint') }}</p>
  </form>
</template>
