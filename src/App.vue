<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScriptEditor from '@/renderer/script-editor.vue'
import { startWorkerRun } from '@/runner/worker-run-client'
import type { WorkerRun } from '@/runner/worker-run-client'
import { decodeShareFragment, encodeShareFragment } from '@/share/share-link-codec'
import type { SharedSettings } from '@/share/share-link-codec'
import { deriveObservableOutput } from '@/trace/derive-observable-output'
import type { ObservableEntry } from '@/trace/observable-output'
import type { Trace } from '@/trace/trace-event'

const shared = decodeShareFragment(window.location.hash)
const script = ref(
  shared?.script ?? "setTimeout(() => console.log('timer'), 10)\nconsole.log('sync')",
)
/** Run settings travel with a share link so the recipient reproduces the same Trace. */
const settings = ref<SharedSettings>(shared?.settings ?? {})
const shareUrl = ref<string | null>(null)
const trace = ref<Trace | null>(null)
const syntaxError = ref<string | null>(null)
/** Index of the current event in the Trace. The Trace is immutable; position is the only state. */
const position = ref(0)
const running = ref(false)
let activeRun: WorkerRun | null = null
// Lets tests shorten the 30 s wall-clock watchdog: /?watchdogMs=300
const watchdogMs = Number(new URLSearchParams(location.search).get('watchdogMs')) || undefined

const events = computed(() => trace.value?.events ?? [])
const replaying = computed(() => trace.value !== null)
const lastPosition = computed(() => events.value.length - 1)
// Derived from the Trace prefix so the console can never disagree with the event list.
const consoleEntries = computed(() =>
  deriveObservableOutput(events.value.slice(0, position.value + 1)),
)

function describeEntry(entry: ObservableEntry): string {
  return entry.kind === 'console'
    ? `${entry.level}: ${entry.text}`
    : `${entry.kind}: ${entry.message}`
}

/** Editing ends the replay: the Trace belongs to the Script that produced it. */
function discardTrace() {
  trace.value = null
  position.value = 0
}

async function run() {
  // The editor shortcut can fire while a Run is in flight.
  if (running.value) return
  syntaxError.value = null
  trace.value = null
  position.value = 0
  running.value = true
  // Plain copy: reactive proxies cannot be posted to a Worker.
  const plainSettings = JSON.parse(JSON.stringify(settings.value)) as SharedSettings
  activeRun = startWorkerRun(script.value, plainSettings, { watchdogMs })
  try {
    const result = await activeRun.result
    if (result.kind === 'ran') trace.value = result.trace
    else if (result.kind === 'syntax-error') {
      syntaxError.value = `${result.message} (line ${result.line}, column ${result.column})`
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
    <ScriptEditor v-model="script" :read-only="replaying" @run="run" />
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

    <button type="button" :disabled="!replaying || position <= 0" @click="position--">Prev</button>
    <button type="button" :disabled="!replaying || position >= lastPosition" @click="position++">
      Next
    </button>

    <template v-if="trace">
      <ol data-testid="event-list">
        <li
          v-for="event in events"
          :key="event.seq"
          :data-seq="event.seq"
          :aria-current="event.seq === position"
        >
          {{ event.seq }} {{ event.k }}
        </li>
      </ol>

      <ul data-testid="console-panel">
        <li v-for="(entry, i) in consoleEntries" :key="i">{{ describeEntry(entry) }}</li>
      </ul>
    </template>
  </main>
</template>
