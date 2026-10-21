<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Ref } from 'vue'
import { MessageSquareIcon, RotateCcwIcon, SettingsIcon, Trash2Icon } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Locale } from '@/i18n/locales'
import type { ReplayState } from '../../player/replay-state'
import type { TraceEvent } from '../../trace/trace-event'
import { createApiKeyStore, readStoredModel, writeStoredModel } from './api-key-store'
import AskAiComposer from './ask-ai-composer.vue'
import AskAiEmptyState from './ask-ai-empty-state.vue'
import AskAiMessages from './ask-ai-messages.vue'
import AskAiSettings from './ask-ai-settings.vue'
import { buildStepContext, currentStep } from './build-step-context'
import { loadModels, pickDefaultModel } from './openrouter-models'
import type { ModelInfo } from './openrouter-models'
import { useAskAi } from './use-ask-ai'

/** Side sheet where the learner asks their own OpenRouter model about the current step. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  script: string
  events: readonly TraceEvent[]
  position: number
  state: ReplayState
}>()

const { t, locale } = useI18n()
const store = createApiKeyStore()
const model = shallowRef(readStoredModel())
const models = shallowRef<readonly ModelInfo[]>([])
const modelStatus = shallowRef<'loading' | 'ready' | 'error'>('loading')
/** Settings stand in for the chat until a key exists; the key field must not vanish as you type. */
const settingsOpen = shallowRef(!store.key.value)
const announcement = shallowRef('')
const composer = useTemplateRef('composer')

const showSettings = settingsOpen
const step = computed(() => currentStep(props.events, props.position))

const ai = useAskAi({
  apiKey: store.key,
  model,
  locale: locale as unknown as Ref<Locale>,
  buildContext: () =>
    buildStepContext({
      script: props.script,
      events: props.events,
      position: props.position,
      state: props.state,
    }),
})

const ERROR_KEYS = {
  'invalid-key': 'invalidKey',
  'no-credits': 'noCredits',
  'rate-limited': 'rateLimited',
  'model-not-found': 'modelNotFound',
  network: 'network',
  empty: 'empty',
  unknown: 'unknown',
} as const

async function fetchModels() {
  modelStatus.value = 'loading'
  try {
    models.value = await loadModels()
    modelStatus.value = 'ready'
    if (!model.value) model.value = pickDefaultModel(models.value) ?? ''
  } catch {
    modelStatus.value = 'error'
  }
}
onMounted(() => void fetchModels())

// A sheet reopened after the key was forgotten goes back to the key field.
watch(open, (isOpen) => {
  if (isOpen && !store.key.value) settingsOpen.value = true
})
watch(model, (id) => {
  if (id) writeStoredModel(id)
})
watch(ai.completed, () => {
  announcement.value = t('ai.answerReady')
})

function send(question: string) {
  announcement.value = ''
  void ai.ask(question)
}

/** Opening puts the cursor where the next action is: the key field, or the question box. */
async function focusFirstField(event: Event) {
  event.preventDefault()
  await nextTick()
  document.querySelector<HTMLElement>('[data-testid="ask-ai-sheet"] [data-autofocus]')?.focus()
}

function closeSettings() {
  settingsOpen.value = false
  void nextTick(() => composer.value?.focus())
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      side="right"
      class="data-[side=right]:w-full data-[side=right]:sm:max-w-105 gap-0 p-0"
      data-testid="ask-ai-sheet"
      @open-auto-focus="focusFirstField"
    >
      <SheetHeader class="gap-2 pr-12 pb-2">
        <div class="flex items-center gap-1">
          <SheetTitle class="mr-auto">{{ t('ai.title') }}</SheetTitle>
          <Tooltip v-if="ai.messages.value.length > 0 && !showSettings">
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" :aria-label="t('ai.clear')" data-testid="ask-ai-clear" @click="ai.clear()">
                <Trash2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ t('ai.clear') }}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon-sm"
                :aria-label="settingsOpen ? t('ai.back') : t('ai.settings')"
                :aria-pressed="showSettings"
                :disabled="!store.key.value"
                data-testid="ask-ai-settings-button"
                @click="settingsOpen = !settingsOpen"
              >
                <MessageSquareIcon v-if="settingsOpen" />
                <SettingsIcon v-else />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ settingsOpen ? t('ai.back') : t('ai.settings') }}</TooltipContent>
          </Tooltip>
        </div>
        <SheetDescription class="sr-only">{{ t('ai.description') }}</SheetDescription>
        <div>
          <Badge variant="outline" :class="step && 'font-mono'" data-testid="ask-ai-context">
            <span class="sr-only">{{ t('ai.context.label') }}: </span>
            {{ step ? t('ai.context.step', { seq: step.seq, kind: step.kind }) : t('ai.context.none') }}
          </Badge>
        </div>
      </SheetHeader>

      <AskAiSettings
        v-if="showSettings"
        v-model:model="model"
        :store="store"
        :models="models"
        :model-status="modelStatus"
        @done="closeSettings"
        @retry-models="fetchModels"
      />
      <template v-else>
        <AskAiMessages v-if="ai.messages.value.length > 0" :messages="ai.messages.value" :streaming="ai.streaming.value" />
        <AskAiEmptyState v-else @pick="send" />

        <Alert v-if="ai.error.value" variant="destructive" class="mx-3 mb-2 w-auto" role="alert" data-testid="ask-ai-error">
          <AlertDescription class="flex flex-col gap-2">
            <span>{{ t(`ai.errors.${ERROR_KEYS[ai.error.value.kind]}`) }}</span>
            <span v-if="ai.error.value.kind === 'unknown' && ai.error.value.detail" class="text-xs">
              {{ t('ai.errors.detail', { detail: ai.error.value.detail }) }}
            </span>
            <span class="flex gap-2">
              <Button size="xs" variant="outline" data-testid="ask-ai-retry" @click="ai.retry()">
                <RotateCcwIcon />
                {{ t('ai.errors.retry') }}
              </Button>
              <Button
                v-if="ai.error.value.kind === 'invalid-key' || ai.error.value.kind === 'model-not-found'"
                size="xs"
                variant="outline"
                @click="settingsOpen = true; ai.dismissError()"
              >
                {{ t('ai.settings') }}
              </Button>
              <Button size="xs" variant="ghost" @click="ai.dismissError()">{{ t('ai.errors.dismiss') }}</Button>
            </span>
          </AlertDescription>
        </Alert>

        <AskAiComposer
          ref="composer"
          v-model:model="model"
          :streaming="ai.streaming.value"
          :models="models"
          :model-status="modelStatus"
          @send="send"
          @stop="ai.stop()"
          @retry-models="fetchModels"
        />
      </template>

      <div class="sr-only" role="status" aria-live="polite">{{ announcement }}</div>
    </SheetContent>
  </Sheet>
</template>
