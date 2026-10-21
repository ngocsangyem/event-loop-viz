<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { EyeIcon, EyeOffIcon, ExternalLinkIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import AskAiModelPicker from './ask-ai-model-picker.vue'
import type { ApiKeyStore } from './api-key-store'
import type { ModelInfo } from './openrouter-models'

/** API key, where it is kept, and the model. Shown in place of the chat until a key exists. */
const props = defineProps<{
  store: ApiKeyStore
  models: readonly ModelInfo[]
  modelStatus: 'loading' | 'ready' | 'error'
}>()
const model = defineModel<string>('model', { required: true })
const emit = defineEmits<{ done: []; retryModels: [] }>()

const { t } = useI18n()
const reveal = shallowRef(false)
</script>

<template>
  <section class="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-2" data-testid="ask-ai-settings">
    <p v-if="!store.key.value" class="text-sm">{{ t('ai.key.needed') }}</p>

    <div class="flex flex-col gap-1.5">
      <Label for="ask-ai-key">{{ t('ai.key.label') }}</Label>
      <InputGroup>
        <InputGroupInput
          id="ask-ai-key"
          :type="reveal ? 'text' : 'password'"
          :model-value="store.key.value"
          :placeholder="t('ai.key.placeholder')"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          data-autofocus
          data-testid="ask-ai-key"
          @update:model-value="store.setKey(String($event))"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            :aria-label="reveal ? t('ai.key.hide') : t('ai.key.show')"
            :aria-pressed="reveal"
            @click="reveal = !reveal"
          >
            <EyeOffIcon v-if="reveal" />
            <EyeIcon v-else />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <a
        href="https://openrouter.ai/keys"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
      >
        {{ t('ai.key.get') }}
        <ExternalLinkIcon class="size-3" aria-hidden="true" />
      </a>
    </div>

    <div class="flex items-start gap-3">
      <Switch
        id="ask-ai-remember"
        :model-value="store.remember.value"
        class="mt-0.5"
        data-testid="ask-ai-remember"
        @update:model-value="store.setRemember($event === true)"
      />
      <div class="flex flex-col gap-1">
        <Label for="ask-ai-remember">{{ t('ai.key.remember') }}</Label>
        <p class="text-muted-foreground text-xs">{{ t('ai.key.rememberHint') }}</p>
      </div>
    </div>

    <p class="bg-muted text-muted-foreground rounded-lg p-2.5 text-xs">{{ t('ai.key.privacy') }}</p>

    <div class="flex flex-col gap-1.5">
      <Label>{{ t('ai.models.label') }}</Label>
      <AskAiModelPicker v-model="model" :models="props.models" :status="modelStatus" @retry="emit('retryModels')" />
    </div>

    <div class="mt-auto flex items-center justify-between gap-2 pb-2">
      <Button variant="outline" size="sm" :disabled="!store.key.value" data-testid="ask-ai-forget" @click="store.forget()">
        {{ t('ai.key.forget') }}
      </Button>
      <Button size="sm" :disabled="!store.key.value" data-testid="ask-ai-done" @click="emit('done')">
        {{ t('ai.key.done') }}
      </Button>
    </div>
  </section>
</template>
