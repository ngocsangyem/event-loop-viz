<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import ScriptEditor from '@/renderer/script-editor.vue'
import ConsolePanel from '@/renderer/console-panel.vue'
import TransportBar from '@/renderer/transport-bar.vue'
import ExamplePicker from '@/renderer/example-picker.vue'
import UnsupportedApiNotice from '@/renderer/unsupported-api-notice.vue'
import { EXAMPLES, findExample } from '@/examples/example-library'
import SceneView from '@/renderer/scene/event-loop-scene.vue'
import { decodeShareFragment, encodeShareFragment } from '@/share/share-link-codec'
import AdvancedSettings from '@/renderer/advanced-settings.vue'
import HaltBanner from '@/renderer/halt-banner.vue'
import TimingSensitiveBadge from '@/renderer/timing-sensitive-badge.vue'
import BottomPanel from '@/renderer/bottom-panel.vue'
import EventList from '@/renderer/event-list.vue'
import EventDetail from '@/renderer/event-detail.vue'
import StepAnnouncer from '@/renderer/step-announcer.vue'
import { useRunSession } from '@/use-run-session'

const shared = decodeShareFragment(window.location.hash)
const shareUrl = ref<string | null>(null)
const editor = useTemplateRef('editor')
const transport = useTemplateRef('transport')
const runButton = useTemplateRef<HTMLButtonElement>('runButton')

/**
 * The Run button is disabled mid-Run, which drops keyboard focus to the page. Put it back where
 * the next action is: the playback controls after a Trace, the Run button after a failure.
 */
async function restoreFocusAfterRun() {
  await nextTick()
  if (document.activeElement && document.activeElement !== document.body) return
  if (session.trace.value) transport.value?.focusStep()
  else runButton.value?.focus()
}

const session = useRunSession({
  initial: shared ?? undefined,
  onSettled: () => void restoreFocusAfterRun(),
  // Lets tests shorten the 30 s wall-clock watchdog: /?watchdogMs=300
  watchdogMs: Number(new URLSearchParams(location.search).get('watchdogMs')) || undefined,
})
const {
  script, settings, trace, syntaxError, syntaxErrorAt, position, running, showAll, events,
  halt, replaying, player, replayState, consoleOutput, sourceHighlight, previousReplayState,
  unsupportedApis, run, cancel,
} = session

/** The "Edit" button vanishes with the replay banner, so focus moves to the editor it unlocks. */
async function editScript() {
  session.discardTrace()
  await nextTick()
  editor.value?.focus()
}

function loadExample(id: string) {
  const example = findExample(id)
  if (!example) return
  session.discardTrace()
  syntaxError.value = null
  script.value = example.script
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
  <main class="app-shell">
    <h1 class="visually-hidden">Event Loop Visualizer</h1>
    <StepAnnouncer :events="events" :position="position" />
    <div class="pane-editor">
      <ScriptEditor
      ref="editor"
      v-model="script"
      :read-only="replaying"
      :error-at="syntaxErrorAt"
      :highlight="sourceHighlight"
      @run="run"
    />
    <ExamplePicker :examples="EXAMPLES" @load="loadExample" />
    <AdvancedSettings v-model="settings" />
    <UnsupportedApiNotice :apis="unsupportedApis" />
    <p v-if="replaying" data-testid="replay-banner">
      Read-only during replay.
      <button type="button" @click="editScript">Edit (discards Trace)</button>
    </p>
    <button ref="runButton" type="button" :disabled="running" @click="run">Run</button>
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

    </div>

    <div class="pane-scene">
      <HaltBanner :halt="halt" />
      <TimingSensitiveBadge :timing-sensitive="trace?.header.timingSensitive ?? false" />
      <SceneView :state="replayState" :previous="previousReplayState" />
      <TransportBar ref="transport" v-model="position" :player="player" :events="events" />
    </div>

    <BottomPanel v-if="trace" class="pane-panels">
      <template #console>
        <ConsolePanel :output="consoleOutput" />
      </template>
      <template #events>
        <EventList v-model="position" v-model:show-all="showAll" :events="events" />
        <EventDetail :events="events" :position="position" @select="position = $event" />
      </template>
    </BottomPanel>
  </main>
</template>
