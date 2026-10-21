<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { PromptInput } from '@/components/ui/prompt-input'

/**
 * The footer: a single-line prompt with the model id and key note under it. The model is changed
 * in Settings; sending with no model chosen opens Settings instead of failing silently.
 */
const props = defineProps<{ streaming: boolean; model: string }>()
const emit = defineEmits<{ send: [text: string]; stop: []; settings: [] }>()

const { t } = useI18n()
const draft = shallowRef('')
const input = useTemplateRef('input')
// Below the xl breakpoint the panel is a bottom sheet, which wants 48px touch targets.
const wide = useMediaQuery('(min-width: 1280px)')
const hint = computed(() => t('ai.input.hint', { model: props.model || t('ai.models.choose') }))

function submit(text: string) {
  if (!props.model) return emit('settings')
  emit('send', text)
  draft.value = ''
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="border-border shrink-0 border-t px-4 pt-3 pb-3.5">
    <PromptInput
      ref="input"
      v-model="draft"
      :size="wide ? 'lg' : 'touch'"
      :placeholder="t('ai.input.placeholder')"
      :label="t('ai.input.label')"
      :hint="hint"
      :busy="streaming"
      data-autofocus
      data-testid="ask-ai-input"
      @send="submit"
      @stop="emit('stop')"
    />
  </div>
</template>
