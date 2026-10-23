<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SharedSettings } from '@/share/share-link-codec'
import { EXAMPLES } from '@/examples/example-library'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { ReplayState } from '../player/replay-state'
import type { Trace } from '../trace/trace-event'
import ScriptEditor from './script-editor.vue'
import EditorPaneHeader from './editor-pane-header.vue'
import EditorRunFooter from './editor-run-footer.vue'
import SourceRunSummary from './source-run-summary.vue'
import UnsupportedApiNotice from './unsupported-api-notice.vue'
import { queuedLinesAt } from './queued-line-markers'
import { findUnsupportedUsages } from './unsupported-api-marks'
import type { SourceHighlight } from './source-highlight'
import type { SyntaxErrorPosition } from './syntax-error-marker'

/**
 * The Script editor pane (Edit) and the read-only Source pane (Replay): everything that acts on
 * the Script. The optional props feed the Source pane and default to an empty replay.
 */
const props = withDefaults(
  defineProps<{
    replaying: boolean
    running: boolean
    syntaxError: string | null
    syntaxErrorAt: SyntaxErrorPosition | null
    highlight: SourceHighlight | null
    unsupportedApis: readonly string[]
    /** The Trace being replayed: sizes the Source footer. */
    trace?: Trace | null
    /** The replay state at the playhead: places the queued-work squares in the Source gutter. */
    replayState?: ReplayState | null
    /** Which Run this is; the Source footer prints `RUN #n`. */
    runNumber?: number | null
  }>(),
  { trace: null, replayState: null, runNumber: null },
)
const script = defineModel<string>('script', { required: true })
const settings = defineModel<SharedSettings>('settings', { required: true })
const emit = defineEmits<{ run: []; cancel: []; edit: []; 'load-example': [id: string]; 'video-opened': [] }>()

const { t } = useI18n()
const editor = useTemplateRef('editor')
const footer = useTemplateRef('footer')
defineExpose({
  focus: () => editor.value?.focus(),
  focusRun: () => footer.value?.focusRun(),
})

/** Unsupported APIs block the Run; a replayed Trace already ran, so only editing can be blocked. */
const blocked = computed(() => !props.replaying && props.unsupportedApis.length > 0)
const usages = computed(() => findUnsupportedUsages(script.value, props.unsupportedApis))
const currentExampleId = computed(() => EXAMPLES.find((e) => e.script === script.value)?.id ?? null)
const queuedLines = computed(() => (props.replayState ? queuedLinesAt(props.replayState) : new Map()))
// The engine's message without the position suffix the session appends: the lint row sits at the position.
const syntaxMessage = computed(() => props.syntaxError?.replace(/\s*\(line \d+, column \d+\)$/, '') ?? '')

function requestRun() {
  if (!props.running && !blocked.value) emit('run')
}
</script>

<template>
  <section class="flex min-h-full min-w-0 flex-col" role="region" :aria-label="t('editor.region')" data-drive-target="source">
    <EditorPaneHeader
      :mode="replaying ? 'source' : 'edit'"
      :running="running"
      :examples="EXAMPLES"
      :current-example-id="currentExampleId"
      @edit="emit('edit')"
      @load-example="emit('load-example', $event)"
      @video-opened="emit('video-opened')"
    />
    <progress v-if="running" class="sr-only" :aria-label="t('editor.running')">{{ t('editor.runningText') }}</progress>
    <div
      :class="[
        'border-border-soft bg-secondary mx-4 min-w-0 border',
        replaying ? 'source-card mt-4 py-2' : 'mt-4 mb-3',
      ]"
    >
      <div
        v-if="!replaying"
        class="text-muted-foreground flex h-8 items-center px-3 font-mono text-[11px] leading-none font-medium uppercase"
      >
        JS · SCRIPT.JS
      </div>
      <ScriptEditor
        ref="editor"
        v-model="script"
        :read-only="replaying || running"
        :source="replaying"
        :error-at="syntaxErrorAt"
        :error-message="syntaxMessage"
        :unsupported-apis="unsupportedApis"
        :queued-lines="queuedLines"
        :highlight="highlight"
        @run="requestRun"
      />
    </div>
    <template v-if="!replaying">
      <Alert v-if="syntaxError" tone="syntax" class="mx-4 mb-4 w-auto" data-testid="syntax-error-notice">
        <AlertTitle>{{ t('syntax.title') }}</AlertTitle>
        <AlertDescription>{{ syntaxError }}</AlertDescription>
        <AlertAction v-if="syntaxErrorAt" class="mt-1">
          <button type="button" class="cursor-pointer uppercase underline underline-offset-[3px]" @click="editor?.goToLine(syntaxErrorAt.line)">
            {{ t('syntax.goToLine', { line: syntaxErrorAt.line }) }}
          </button>
        </AlertAction>
      </Alert>
      <UnsupportedApiNotice :apis="unsupportedApis" :usages="usages" />
      <EditorRunFooter
        ref="footer"
        v-model:settings="settings"
        :running="running"
        :blocked="blocked"
        @run="requestRun"
        @cancel="emit('cancel')"
      />
    </template>
    <SourceRunSummary v-else-if="trace" :trace="trace" :run-number="runNumber" />
  </section>
</template>
