<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Ref } from 'vue'
import type { Locale } from '@/i18n/locales'
import type { Player } from '../../player/player'
import type { ReplayState } from '../../player/replay-state'
import type { TraceEvent } from '../../trace/trace-event'
import { createApiKeyStore } from './api-key-store'
import AskAiComposer from './ask-ai-composer.vue'
import AskAiContextLine from './ask-ai-context-line.vue'
import AskAiEmptyState from './ask-ai-empty-state.vue'
import AskAiErrorAlert from './ask-ai-error-alert.vue'
import AskAiMessages from './ask-ai-messages.vue'
import AskAiPanelHeader from './ask-ai-panel-header.vue'
import AskAiPreparingLine from './ask-ai-preparing-line.vue'
import AskAiSettingsDialog from './ask-ai-settings-dialog.vue'
import AskAiTourControls from './ask-ai-tour-controls.vue'
import { buildRunContext } from './build-run-context'
import { focusAutofocusTarget } from './focus-autofocus-target'
import { stepNumberAt } from './step-number'
import { useAiTour } from './use-ai-tour'
import { useAskAi } from './use-ask-ai'
import { useAskAiSend } from './use-ask-ai-send'
import { useOpenRouterModelChoice } from './use-openrouter-model-choice'

/**
 * The Ask AI chat, its settings dialog and the tour. Wide screens give it the right column
 * (the Why rail's place); narrower it is a bottom sheet. Next / Prev emit `seek`; minimized, the
 * tour controls become a segment of the dock.
 */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  script: string
  events: readonly TraceEvent[]
  position: number
  state: ReplayState
  player: Player | null
  /** Runs the Script when there is no Trace yet, so a question always sees the whole Run. */
  ensureRun: () => Promise<void>
  /** Which Run this is, for the context line; omitted until the app numbers its Runs. */
  runNumber?: number
}>()
const emit = defineEmits<{ seek: [position: number]; minimize: [] }>()

const { t, locale } = useI18n()
const store = createApiKeyStore()
const { model, models, status: modelStatus, fetchModels } = useOpenRouterModelChoice()
const settingsOpen = shallowRef(false)
const announcement = shallowRef('')
const panel = useTemplateRef('panel')
const stepCount = computed(() => props.events.filter((e) => e.visible).length)

const stepOf = (seq: number) => stepNumberAt(props.events, seq)
const currentStep = computed(() => stepOf(props.position))

const ai = useAskAi({
  apiKey: store.key,
  model,
  locale: locale as unknown as Ref<Locale>,
  buildContext: () =>
    buildRunContext({
      script: props.script,
      events: props.events,
      position: props.position,
      state: props.state,
      finalState: props.player ? props.player.stateAt(props.player.last()) : props.state,
    }),
})
const tour = useAiTour({
  messages: ai.messages,
  streaming: ai.streaming,
  // An event number from the AI lands on the next step the replay can show; one past the end of
  // the Trace was made up, so its heading stays plain text.
  resolver: computed(() => {
    const player = props.player
    return player ? (seq: number) => (seq < player.eventCount ? player.seek(seq) : null) : null
  }),
  position: computed(() => props.position),
  seek: (seq) => emit('seek', seq),
  onStop: (stop, i, total) => (announcement.value = t('ai.tour.announce', { current: i + 1, total, title: stop.title })),
})

watch(ai.completed, () => (announcement.value = t('ai.answerReady')))

/** The cursor goes where the next action is. */
async function focusPanel() {
  await nextTick()
  focusAutofocusTarget(panel.value)
}
watch(open, (isOpen) => isOpen && void focusPanel(), { immediate: true })

const { preparing, send } = useAskAiSend({
  hasKey: () => !!store.key.value,
  hasTrace: () => props.events.length > 0,
  ensureRun: () => props.ensureRun(),
  ask: (question) => ai.ask(question),
  openSettings: () => (settingsOpen.value = true),
  announce: (message) => (announcement.value = message),
  preparingMessage: () => t('ai.preparing'),
})

function minimize() {
  open.value = false
  emit('minimize')
}
// However the dialog closes (Save, Cancel, Esc), focus comes back into the panel.
watch(settingsOpen, (isOpen) => !isOpen && open.value && void focusPanel())
</script>

<template>
  <Transition
    enter-from-class="opacity-0"
    enter-active-class="transition-opacity duration-(--motion-base) ease-out motion-reduce:transition-none"
  >
    <section
      v-show="open"
      id="ask-ai-panel"
      ref="panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ask-ai-title"
      aria-describedby="ask-ai-description"
      class="bg-popover text-popover-foreground fixed inset-x-0 bottom-(--ai-dock) z-40 flex h-[max(16rem,min(640px,calc(100dvh-var(--ai-dock)-4rem)))] w-full flex-col overflow-hidden border-t text-sm xl:static xl:z-auto xl:h-full xl:border-t-0"
      data-testid="ask-ai-panel"
      @keydown.esc.stop="minimize"
    >
      <AskAiPanelHeader
        :can-clear="ai.messages.value.length > 0"
        :tour-active="tour.index.value >= 0"
        @clear="ai.clear()"
        @settings="settingsOpen = true"
        @minimize="minimize"
        @close="minimize"
      />
      <AskAiContextLine :step="currentStep" :total="stepCount" :run-number="runNumber" />
      <AskAiMessages
        v-if="ai.messages.value.length > 0"
        :messages="ai.messages.value"
        :streaming="ai.streaming.value"
        :answers="tour.answers.value"
        :tour="{ messageId: tour.messageId.value, index: tour.index.value }"
        :step-of="stepOf"
        @go="tour.go"
      />
      <AskAiEmptyState v-else :has-key="!!store.key.value" @pick="send" @connect="settingsOpen = true" />

      <AskAiErrorAlert
        v-if="ai.error.value"
        :error="ai.error.value"
        @retry="ai.retry()"
        @settings="settingsOpen = true"
        @dismiss="ai.dismissError()"
      />
      <!-- Before the tour starts, the Start button inside the answer is the way in. -->
      <AskAiTourControls
        v-if="tour.index.value >= 0"
        :stops="tour.stops.value"
        :index="tour.index.value"
        :step-of="stepOf"
        @next="tour.next()"
        @prev="tour.prev()"
      />
      <AskAiPreparingLine v-if="preparing" />
      <AskAiComposer
        v-if="store.key.value"
        :model="model"
        :streaming="ai.streaming.value || preparing"
        @send="send"
        @stop="ai.stop()"
        @settings="settingsOpen = true"
      />
    </section>
  </Transition>

  <!-- Minimized mid-tour: the tour keeps going as a segment of the dock while the visualizer is in full view. -->
  <Teleport defer to="#dock-tour">
    <AskAiTourControls
      v-if="!open && tour.index.value >= 0"
      floating
      :stops="tour.stops.value"
      :index="tour.index.value"
      :step-of="stepOf"
      @next="tour.next()"
      @prev="tour.prev()"
    />
  </Teleport>

  <AskAiSettingsDialog
    v-model:open="settingsOpen"
    v-model:model="model"
    :store="store"
    :models="models"
    :model-status="modelStatus"
    :key-rejected="ai.error.value?.kind === 'invalid-key'"
    @saved="ai.dismissError()"
    @retry-models="fetchModels"
  />
  <div class="sr-only" role="status" aria-live="polite">{{ announcement }}</div>
</template>
