<script setup lang="ts">
import { defineAsyncComponent, nextTick, onMounted, useTemplateRef } from 'vue'
import { findExample } from '@/examples/example-library'
import { decodeShareFragment } from '@/share/share-link-codec'
import { useRunSession } from '@/use-run-session'
import { useShareLink } from '@/use-share-link'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppHeader from '@/renderer/app-header.vue'
import { useAskAiDock } from '@/renderer/ai/use-ask-ai-dock'
import AskAiLauncher from '@/renderer/ai/ask-ai-launcher.vue'
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
import { useLocale } from '@/renderer/use-locale'
import { useAutoplayPreference } from '@/renderer/use-autoplay-preference'
import ChipTravelLayer from '@/renderer/panels/chip-travel-layer.vue'
import { usePanelChipTravel } from '@/renderer/use-panel-chip-travel'

// The 3D Scene and the Diagram are opt-in, so their code and styles load only when picked.
const SceneView = defineAsyncComponent(() => import('@/renderer/scene/event-loop-scene.vue'))
const EventLoopDiagram = defineAsyncComponent(() => import('@/renderer/diagram/event-loop-diagram.vue'))
// Ask AI is opened on demand, so its code loads only then.
const AskAiAssistant = defineAsyncComponent(() => import('@/renderer/ai/ask-ai-assistant.vue'))

const shared = decodeShareFragment(window.location.hash)
let autoRun = false // a share link runs on load; that Run must not move focus the user never placed
const [editor, transport] = [useTemplateRef('editor'), useTemplateRef('transport')]
const { choice: theme } = useColorTheme()
const view = useVisualizerView()
const locale = useLocale()
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
  script, settings, trace, syntaxError, syntaxErrorAt, position, running, showAll, events, halt, replaying,
  player, replayState, consoleOutput, sourceHighlight, previousReplayState, unsupportedApis, run, cancel,
} = session

// The travel layer tells the panel lists when a coming patch is a jump or a flight's landing row.
const { sameView, travelMs } = usePanelChipTravel(view, player, () => transport.value)

const { askOpen, askMounted, toggleAsk, focusLauncher, ensureRun, seekFromTour, dockStyle } = useAskAiDock({
  running, run, position, hasTrace: () => trace.value !== null, pausePlayback: () => transport.value?.pause(),
})

/** The "Edit" button vanishes with the replay banner, so focus moves to the editor it unlocks. */
async function editScript() {
  session.discardTrace()
  await nextTick()
  editor.value?.focus()
}

function loadExample(id: string) {
  const example = findExample(id)
  if (example) session.replaceScript(example.script)
}

const { url: shareUrl, copied: shareCopied, share } = useShareLink(script, settings)

// Opening a share link runs it immediately: the link carries inputs, not a Trace.
onMounted(() => {
  if (!shared) return
  autoRun = true
  void run()
})
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <main class="mx-auto flex max-w-[1440px] flex-col gap-4 p-4" :style="dockStyle">
      <AppHeader v-model:view="view" v-model:theme="theme" v-model:locale="locale" :share-url="shareUrl" :share-copied="shareCopied" @share="share" />
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
          <WebApisPanel v-if="view === 'panels'" :state="replayState" :source="trace?.header.source ?? ''" />
          <ConsolePanel v-else :output="consoleOutput" />
        </div>
        <template v-if="view === 'panels'">
          <ChipTravelLayer
            :player="player"
            :position="position"
            :source="trace?.header.source ?? ''"
            :same-view="sameView"
            :travel-ms="travelMs"
          />
          <div class="flex min-w-0 flex-col gap-4 xl:col-span-4">
            <CallStackPanel :state="replayState" :source="trace?.header.source ?? ''" />
            <ConsolePanel :output="consoleOutput" />
          </div>
          <div class="flex min-w-0 flex-col gap-4 xl:col-span-4">
            <TaskQueuePanel :state="replayState" :source="trace?.header.source ?? ''" />
            <MicrotaskQueuePanel :state="replayState" :source="trace?.header.source ?? ''" />
            <EventLoopPanel :state="replayState" />
          </div>
        </template>
        <Card v-else-if="view === 'diagram'" size="sm" class="min-w-0 md:col-span-2 xl:col-span-8">
          <CardContent>
            <EventLoopDiagram :state="replayState" :event="events[position]" />
          </CardContent>
        </Card>
        <Card v-else size="sm" class="min-w-0 md:col-span-2 xl:col-span-8">
          <CardContent>
            <SceneView :state="replayState" :previous="previousReplayState" />
          </CardContent>
        </Card>
      </div>

      <!-- The pinned dock: an opaque raised band, no blur or shadow; depth is the tone step. -->
      <Card ref="transportCard" size="sm" class="bg-raised sticky bottom-0 z-10">
        <CardContent>
          <TransportBar ref="transport" v-model="position" v-model:autoplay="autoplay"
            :same-view="sameView" :player="player" :events="events" />
        </CardContent>
      </Card>

      <!-- The chat assistant: launcher in the bottom-right corner, the tour beside it when minimized. -->
      <div class="fixed right-4 bottom-(--ai-dock) z-40 flex items-end gap-2">
        <AskAiAssistant
          v-if="askMounted"
          v-model:open="askOpen"
          :script="script"
          :events="events"
          :position="position"
          :state="replayState"
          :player="player"
          :ensure-run="ensureRun"
          @seek="seekFromTour"
          @minimize="focusLauncher"
        />
        <AskAiLauncher ref="launcher" :open="askOpen" @toggle="toggleAsk" />
      </div>

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
