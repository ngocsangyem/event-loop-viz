<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { findExample } from '@/examples/example-library'
import { decodeShareFragment, encodeShareFragment } from '@/share/share-link-codec'
import { useRunSession } from '@/use-run-session'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppHeader from '@/renderer/app-header.vue'
import EditorCard from '@/renderer/editor-card.vue'
import ConsolePanel from '@/renderer/console-panel.vue'
import TransportBar from '@/renderer/transport-bar.vue'
import HaltBanner from '@/renderer/halt-banner.vue'
import TimingSensitiveBadge from '@/renderer/timing-sensitive-badge.vue'
import EventList from '@/renderer/event-list.vue'
import EventDetail from '@/renderer/event-detail.vue'
import StepAnnouncer from '@/renderer/step-announcer.vue'
import CallStackPanel from '@/renderer/panels/call-stack-panel.vue'
import TaskQueuePanel from '@/renderer/panels/task-queue-panel.vue'
import MicrotaskQueuePanel from '@/renderer/panels/microtask-queue-panel.vue'
import WebApisPanel from '@/renderer/panels/web-apis-panel.vue'
import EventLoopPanel from '@/renderer/panels/event-loop-panel.vue'
import { useColorTheme } from '@/renderer/use-color-theme'
import { useVisualizerView } from '@/renderer/use-visualizer-view'
import { useAutoplayPreference } from '@/renderer/use-autoplay-preference'
import { panelSignature } from '@/renderer/panels/panel-view-model'
import type { SameView } from '@/renderer/use-playback'

// The 3D Scene is opt-in, so its code and styles load only when that view is picked.
const SceneView = defineAsyncComponent(() => import('@/renderer/scene/event-loop-scene.vue'))

const shared = decodeShareFragment(window.location.hash)
const shareUrl = ref<string | null>(null)
/** Whether the last Share put the link on the clipboard; copying can be denied. */
const shareCopied = ref(false)
/** A share link runs on load; that Run must not move focus the user never placed. */
let autoRun = false
const editor = useTemplateRef('editor')
const transport = useTemplateRef('transport')
const { choice: theme } = useColorTheme()
const view = useVisualizerView()
const autoplay = useAutoplayPreference()

/**
 * After a Run: start playback when auto-play is on, then put keyboard focus back. The Run button
 * is disabled mid-Run, which drops focus to the page, so it goes where the next action is: the
 * playback controls after a Trace, the Run button after a failure.
 */
async function afterRun() {
  await nextTick()
  // The panels animate the Run by themselves, like a video, unless the viewer opted out.
  if (session.trace.value && autoplay.value) transport.value?.play()
  if (autoRun) {
    autoRun = false
    return
  }
  if (document.activeElement && document.activeElement !== document.body) return
  if (session.trace.value) transport.value?.focusStep()
  else editor.value?.focusRun()
}

const session = useRunSession({
  initial: shared ?? undefined,
  onSettled: () => void afterRun(),
  // Lets tests shorten the 30 s wall-clock watchdog: /?watchdogMs=300
  watchdogMs: Number(new URLSearchParams(location.search).get('watchdogMs')) || undefined,
})
const {
  script, settings, trace, syntaxError, syntaxErrorAt, position, running, showAll, events,
  halt, replaying, player, replayState, consoleOutput, sourceHighlight, previousReplayState,
  unsupportedApis, run, cancel,
} = session

/** In the panels view, playback passes over steps the panels draw identically. */
const sameView = computed((): SameView | undefined => {
  const current = player.value
  if (view.value !== 'panels' || !current) return undefined
  return (from, to) => panelSignature(current.stateAt(from)) === panelSignature(current.stateAt(to))
})

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
  shareCopied.value = false
  try {
    await navigator.clipboard.writeText(url.href)
    shareCopied.value = true
  } catch {
    // Clipboard may be denied; the URL stays visible and in the address bar.
  }
}

// Opening a share link runs it immediately: the link carries inputs, not a Trace.
onMounted(() => {
  if (!shared) return
  autoRun = true
  void run()
})
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <main class="mx-auto flex max-w-[1440px] flex-col gap-4 p-4">
      <AppHeader v-model:view="view" v-model:theme="theme" :share-url="shareUrl" :share-copied="shareCopied" @share="share" />
      <StepAnnouncer :events="events" :position="position" />
      <HaltBanner :halt="halt" />
      <TimingSensitiveBadge :timing-sensitive="trace?.header.timingSensitive ?? false" />

      <!-- Desktop: three columns like the event loop reads, left to right. Phone: one column. -->
      <div class="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div class="flex min-w-0 flex-col gap-4 md:col-span-2 xl:col-span-4">
          <EditorCard
            ref="editor"
            v-model:script="script"
            v-model:settings="settings"
            :replaying="replaying"
            :running="running"
            :syntax-error="syntaxError"
            :syntax-error-at="syntaxErrorAt"
            :highlight="sourceHighlight"
            :unsupported-apis="unsupportedApis"
            @run="run"
            @cancel="cancel"
            @edit="editScript"
            @load-example="loadExample"
          />
          <WebApisPanel v-if="view === 'panels'" :state="replayState" />
          <ConsolePanel v-else :output="consoleOutput" />
        </div>
        <template v-if="view === 'panels'">
          <div class="flex min-w-0 flex-col gap-4 xl:col-span-4">
            <CallStackPanel :state="replayState" />
            <ConsolePanel :output="consoleOutput" />
          </div>
          <div class="flex min-w-0 flex-col gap-4 xl:col-span-4">
            <TaskQueuePanel :state="replayState" />
            <MicrotaskQueuePanel :state="replayState" />
            <EventLoopPanel :state="replayState" />
          </div>
        </template>
        <Card v-else size="sm" class="min-w-0 md:col-span-2 xl:col-span-8">
          <CardContent>
            <SceneView :state="replayState" :previous="previousReplayState" />
          </CardContent>
        </Card>
      </div>

      <Card size="sm" class="bg-card/90 sticky bottom-3 z-10 shadow-lg backdrop-blur">
        <CardContent>
          <TransportBar ref="transport" v-model="position" v-model:autoplay="autoplay"
            :same-view="sameView" :player="player" :events="events" />
        </CardContent>
      </Card>

      <!-- scroll-mb keeps a focused row or button clear of the sticky playback bar above. -->
      <Card v-if="trace" size="sm" role="region" aria-label="Trace events" class="[&_button]:scroll-mb-40 [&_a]:scroll-mb-40">
        <CardContent class="grid gap-4 lg:grid-cols-2">
          <EventList v-model="position" v-model:show-all="showAll" :events="events" />
          <EventDetail :events="events" :position="position" @select="position = $event" />
        </CardContent>
      </Card>
    </main>
  </TooltipProvider>
</template>
