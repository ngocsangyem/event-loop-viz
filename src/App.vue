<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import ScriptEditor from '@/renderer/script-editor.vue'
import ConsolePanel from '@/renderer/console-panel.vue'
import TransportBar from '@/renderer/transport-bar.vue'
import ExamplePicker from '@/renderer/example-picker.vue'
import UnsupportedApiNotice from '@/renderer/unsupported-api-notice.vue'
import { EXAMPLES, findExample } from '@/examples/example-library'
import { scanUnsupportedApis } from '@/runner/unsupported-api-scan'
import { startWorkerRun } from '@/runner/worker-run-client'
import type { WorkerRun } from '@/runner/worker-run-client'
import { decodeShareFragment, encodeShareFragment } from '@/share/share-link-codec'
import type { SharedSettings } from '@/share/share-link-codec'
import EventList from '@/renderer/event-list.vue'
import EventDetail from '@/renderer/event-detail.vue'
import { createPlayer } from '@/player/player'
import { withStepOptions } from '@/player/with-step-options'
import type { Trace } from '@/trace/trace-event'

const shared = decodeShareFragment(window.location.hash)
const script = ref(
  shared?.script ?? "setTimeout(() => console.log('timer'), 10)\nconsole.log('sync')",
)
/** Run settings travel with a share link so the recipient reproduces the same Trace. */
const settings = ref<SharedSettings>(shared?.settings ?? {})
const shareUrl = ref<string | null>(null)
// Shallow: the Trace is immutable and large, deep proxies would only cost.
const trace = shallowRef<Trace | null>(null)
const syntaxError = ref<string | null>(null)
/** Where the engine rejected the Script; drives the editor marker. Cleared on edit. */
const syntaxErrorAt = ref<{ line: number; column: number } | null>(null)
/** Index of the current event in the Trace. The Trace is immutable; position is the only state. */
const position = ref(0)
const running = ref(false)
let activeRun: WorkerRun | null = null
// Lets tests shorten the 30 s wall-clock watchdog: /?watchdogMs=300
const watchdogMs = Number(new URLSearchParams(location.search).get('watchdogMs')) || undefined

const events = computed(() => trace.value?.events ?? [])
const replaying = computed(() => trace.value !== null)
/** "Show all events" makes Bookkeeping Events steppable, not only visible in the list. */
const showAll = ref(false)
const player = computed(() =>
  trace.value ? withStepOptions(createPlayer(trace.value), { showAll: showAll.value }) : null,
)
// Source ranges at the playhead; host-internal events carry none, which clears the highlight.
const sourceHighlight = computed(() => {
  const state = player.value?.stateAt(position.value)
  return state ? { source: state.sourceRange, cause: state.causeRange } : null
})
// The console is folded by the player; the UI never folds events itself.
const consoleOutput = computed(() => player.value?.stateAt(position.value).console ?? [])
// During replay the Trace header is authoritative; before a Run the live scan of the editor text.
const unsupportedApis = computed(() =>
  trace.value ? trace.value.header.unsupportedApis : scanUnsupportedApis(script.value),
)

// Hiding Bookkeeping Events must not leave the playhead parked on one.
watch(showAll, (on) => {
  if (!on && player.value) position.value = player.value.seek(position.value)
})

watch(script, () => {
  syntaxErrorAt.value = null
})

/** Editing ends the replay: the Trace belongs to the Script that produced it. */
function discardTrace() {
  trace.value = null
  position.value = 0
}

function loadExample(id: string) {
  const example = findExample(id)
  if (!example) return
  discardTrace()
  syntaxError.value = null
  script.value = example.script
}

async function run() {
  // The editor shortcut can fire while a Run is in flight.
  if (running.value) return
  syntaxError.value = null
  syntaxErrorAt.value = null
  trace.value = null
  position.value = 0
  running.value = true
  // Plain copy: reactive proxies cannot be posted to a Worker.
  const plainSettings = JSON.parse(JSON.stringify(settings.value)) as SharedSettings
  activeRun = startWorkerRun(script.value, plainSettings, { watchdogMs })
  try {
    const result = await activeRun.result
    if (result.kind === 'ran') {
      trace.value = result.trace
      position.value = player.value?.first() ?? 0
    } else if (result.kind === 'syntax-error') {
      syntaxError.value = `${result.message} (line ${result.line}, column ${result.column})`
      syntaxErrorAt.value = { line: result.line, column: result.column }
    } else if (result.kind === 'watchdog-killed') {
      syntaxError.value =
        'The run was stopped by the watchdog: it took too long, so no Trace exists.'
    }
  } catch (error) {
    syntaxError.value = `The run could not start: ${error instanceof Error ? error.message : error}`
  } finally {
    running.value = false
    activeRun = null
  }
}

function cancel() {
  activeRun?.cancel()
}

async function share() {
  const url = new URL(window.location.href)
  url.hash = encodeShareFragment({ script: script.value, settings: settings.value })
  shareUrl.value = url.href
  history.replaceState(null, '', url)
  try {
    await navigator.clipboard.writeText(url.href)
  } catch {
    // Clipboard may be denied; the URL stays visible and in the address bar.
  }
}

// Opening a share link runs it immediately: the link carries inputs, not a Trace.
onMounted(() => {
  if (shared) void run()
})
</script>

<template>
  <main>
    <ScriptEditor v-model="script" :read-only="replaying" :error-at="syntaxErrorAt"
      :highlight="sourceHighlight"
      @run="run" />
    <ExamplePicker :examples="EXAMPLES" @load="loadExample" />
    <UnsupportedApiNotice :apis="unsupportedApis" />
    <p v-if="replaying" data-testid="replay-banner">
      Read-only during replay.
      <button type="button" @click="discardTrace">Edit (discards Trace)</button>
    </p>
    <button type="button" :disabled="running" @click="run">Run</button>
    <template v-if="running">
      <progress aria-label="Running">Running…</progress>
      <button type="button" @click="cancel">Cancel</button>
    </template>
    <button type="button" @click="share">Share</button>
    <input
      v-if="shareUrl"
      data-testid="share-url"
      aria-label="Share URL"
      :value="shareUrl"
      readonly
    />
    <p v-if="syntaxError" role="alert">{{ syntaxError }}</p>

    <TransportBar v-model="position" :player="player" :events="events" />

    <template v-if="trace">
      <EventList v-model="position" v-model:show-all="showAll" :events="events" />
      <EventDetail :events="events" :position="position" @select="position = $event" />

      <ConsolePanel :output="consoleOutput" />
    </template>
  </main>
</template>
