<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DialogBody, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { TextField } from '@/components/ui/text-field'
import AskAiModelPicker from './ask-ai-model-picker.vue'
import type { ModelInfo } from './openrouter-models'

/** The settings form: key, whether to remember it, and the model. It edits a draft; the dialog decides when to save. */
defineProps<{
  models: readonly ModelInfo[]
  modelStatus: 'loading' | 'ready' | 'error'
  /** Shown under the key field when OpenRouter rejected this key. */
  keyRejected: boolean
}>()
const apiKey = defineModel<string>('apiKey', { required: true })
const remember = defineModel<boolean>('remember', { required: true })
const model = defineModel<string>('model', { required: true })
const reveal = defineModel<boolean>('reveal', { required: true })
const emit = defineEmits<{ retryModels: []; submit: [] }>()
const { t } = useI18n()
</script>

<template>
  <DialogBody data-testid="ask-ai-settings">
    <DialogDescription>{{ t('ai.settingsDescription') }}</DialogDescription>

    <div class="flex flex-col gap-2">
      <TextField
        v-model="apiKey"
        class="[&_label]:uppercase"
        :label="t('ai.key.label')"
        :type="reveal ? 'text' : 'password'"
        :placeholder="t('ai.key.placeholder')"
        :action="reveal ? t('ai.key.hide') : t('ai.key.show')"
        :error="keyRejected ? t('ai.key.rejected') : undefined"
        :helper="t('ai.key.stored')"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        data-autofocus
        data-testid="ask-ai-key"
        @action="reveal = !reveal"
        @keydown.enter.prevent="emit('submit')"
      />
      <a
        href="https://openrouter.ai/keys"
        target="_blank"
        rel="noopener noreferrer"
        class="text-foreground hover:bg-accent focus-visible:outline-ring -mx-1 w-fit px-1 text-[13px] leading-5 underline underline-offset-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
      >{{ t('ai.key.get') }} <span aria-hidden="true">↗</span></a>
    </div>

    <div class="flex flex-col gap-1">
      <Switch
        v-model="remember"
        :label="t('ai.key.remember')"
        :on-label="t('ai.key.on')"
        :off-label="t('ai.key.off')"
        class="-ml-2 w-fit"
        data-testid="ask-ai-remember"
      />
      <p class="text-muted-foreground text-[13px] leading-5">{{ t('ai.key.rememberHint') }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-muted-foreground font-mono text-[11.5px] leading-[14px] font-medium tracking-[0.02em] uppercase">{{ t('ai.models.label') }}</span>
      <AskAiModelPicker v-model="model" :models="models" :status="modelStatus" @retry="emit('retryModels')" />
    </div>
  </DialogBody>
</template>
