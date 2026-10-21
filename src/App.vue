<script setup lang="ts">
import { defineAsyncComponent, nextTick, onMounted, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { findExample } from '@/examples/example-library'
import { LOCALES } from '@/i18n/locales'
import { decodeShareFragment } from '@/share/share-link-codec'
import { useRunSession } from '@/use-run-session'
import { useShareLink } from '@/use-share-link'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppHeader from '@/renderer/app-header.vue'
import { useAskAiDock } from '@/renderer/ai/use-ask-ai-dock'
import AskAiLauncher from '@/renderer/ai/ask-ai-launcher.vue'
import EditorCard from '@/renderer/editor-card.vue'
import TransportBar from '@/renderer/transport-bar.vue'
import HaltBanner from '@/renderer/halt-banner.vue'
import TimingSensitiveBadge from '@/renderer/timing-sensitive-badge.vue'
import StepAnnouncer from '@/renderer/step-announcer.vue'
import ReplayStage from '@/renderer/replay-stage.vue'
import WhyRail from '@/renderer/why-rail.vue'
import ModeTabs from '@/renderer/mode-tabs.vue'
import ShortcutSheet from '@/renderer/shortcut-sheet.vue'
import { useAppLayout } from '@/renderer/use-app-layout'
import { useAppHotkeys } from '@/renderer/use-app-hotkeys'
import { useColorTheme } from '@/renderer/use-color-theme'
import { useKeysVisibility } from '@/renderer/use-keys-visibility'
import { useVisualizerView } from '@/renderer/use-visualizer-view'
import { useLocale } from '@/renderer/use-locale'
import { useAutoplayPreference } from '@/renderer/use-autoplay-preference'
import { usePanelChipTravel } from '@/renderer/use-panel-chip-travel'

// Ask AI is opened on demand, so its code loads only then.
const AskAiAssistant = defineAsyncComponent(() => import('@/renderer/ai/ask-ai-assistant.vue'))

const { t } = useI18n()
const shared = decodeShareFragment(window.location.hash)
let autoRun = false // a share link runs on load; that Run must not move focus the user never placed
const [editor, transport] = [useTemplateRef('editor'), useTemplateRef('transport')]
const { choice: theme, toggle: toggleTheme } = useColorTheme()
const keys = useKeysVisibility()
const view = useVisualizerView()
const locale = useLocale()
const autoplay = useAutoplayPreference()
/** Runs that produced a Trace this session; the header prints it as `RUN #n`. */
const runCount = shallowRef(0)
const shareOpen = shallowRef(false)
const sheetOpen = shallowRef(false)

/**
 * After a Run: start playback when auto-play is on, then put keyboard focus back. The Run button
 * is disabled mid-Run, which drops focus to the page, so it goes where the next action is: the
 * playback controls after a Trace, the Run button after a failure.
 */
async function afterRun() {
  if (session.trace.value) runCount.value++
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
  player, replayState, sourceHighlight, previousReplayState, unsupportedApis, run, cancel,
} = session

// The travel layer tells the panel lists when a coming patch is a jump or a flight's landing row.
const { sameView, travelMs } = usePanelChipTravel(view, player, () => transport.value)

const { askOpen, askMounted, toggleAsk, focusLauncher, ensureRun, seekFromTour, dockStyle } = useAskAiDock({
  running, run, position, hasTrace: () => trace.value !== null, pausePlayback: () => transport.value?.pause(),
})
const { tab, gridStyle } = useAppLayout({ replaying, askOpen })

/** The "Edit" button vanishes with the replay banner, so focus moves to the editor it unlocks. */
async function editScript() {
  session.discardTrace()
  await nextTick()
  editor.value?.focus()
}

/** E: the Script becomes editable, which ends the replay; with no Trace it just focuses the editor. */
function editFromKey() {
  if (replaying.value) void editScript()
  else editor.value?.focus()
}

/** R: back to the replay (the phone's REPLAY tab) with the playback controls focused. */
function replayFromKey() {
  if (!replaying.value) return
  tab.value = 'replay'
  transport.value?.focusStep()
}

const toggleLocale = () => (locale.value = LOCALES[(LOCALES.indexOf(locale.value) + 1) % LOCALES.length]!)

/** P / N: the tour's Prev and Next live in the Ask AI panel or its dock segment, whichever shows. */
function tourStep(direction: 'prev' | 'next') {
  document.querySelector<HTMLButtonElement>(`[data-testid="ask-ai-tour-${direction}"]:not(:disabled)`)?.click()
}

useAppHotkeys({
  edit: editFromKey,
  replay: replayFromKey,
  setView: (next) => (view.value = next),
  toggleLocale,
  toggleTheme,
  toggleShare: () => {
    shareOpen.value = !shareOpen.value
    if (shareOpen.value) share()
  },
  toggleAsk,
  toggleSheet: () => (sheetOpen.value = !sheetOpen.value),
  tourStep,
  run: () => {
    if (!replaying.value && !running.value && unsupportedApis.value.length === 0) void run()
  },
  cancelRun: () => {
    if (running.value) cancel()
  },
})

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
    <!-- Wide screens: a full-height shell whose columns scroll on their own above the pinned dock. -->
    <main class="flex flex-col xl:h-dvh" :style="dockStyle">
      <AppHeader
        v-model:view="view"
        v-model:share-open="shareOpen"
        :theme="theme"
        :locale="locale"
        :keys-on="keys.stored.value === 'on'"
        :mode="replaying ? 'replay' : 'edit'"
        :can-replay="replaying"
        :run-number="runCount"
        :share-url="shareUrl"
        :share-copied="shareCopied"
        @share="share"
        @edit="editFromKey"
        @replay="replayFromKey"
        @toggle-locale="toggleLocale"
        @toggle-theme="toggleTheme"
        @toggle-keys="keys.toggle"
      />
      <StepAnnouncer :events="events" :position="position" />
      <div class="border-border flex flex-col border-b empty:hidden">
        <HaltBanner :halt="halt" @raise-budget="editScript" />
        <TimingSensitiveBadge :timing-sensitive="trace?.header.timingSensitive ?? false" />
      </div>
      <ModeTabs v-model="tab" :can-replay="replaying" class="md:hidden" />

      <!--
        Edit: Script | stage. Replay: Source | stage | Why rail; Ask AI takes the right column.
        Columns are ruled by a 1px gap on the line colour, full bleed. A phone shows one tab at a time.
      -->
      <div
        class="ruled bg-border grid min-h-0 flex-1 gap-px lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-(--app-cols)"
        :style="gridStyle"
      >
        <div :class="['bg-background min-w-0 xl:overflow-y-auto', tab === 'replay' && 'source-peek']">
          <EditorCard
            ref="editor"
            v-model:script="script"
            v-model:settings="settings"
            class="border-0"
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
        </div>
        <div :class="['bg-background min-w-0 xl:overflow-y-auto', tab === 'script' && 'max-md:hidden']">
          <ReplayStage
            :view="view"
            :events="events"
            :position="position"
            :state="replayState"
            :previous="previousReplayState"
            :player="player"
            :source="trace?.header.source ?? ''"
            :running="running"
            :same-view="sameView"
            :travel-ms="travelMs"
          />
        </div>
        <div
          v-show="trace || askOpen"
          :class="['bg-background min-w-0 lg:col-span-2 xl:col-span-1 xl:min-h-0 xl:overflow-y-auto', tab === 'script' && 'max-md:hidden']"
        >
          <WhyRail v-if="trace" v-model="position" v-model:show-all="showAll" :events="events" :class="askOpen && 'xl:hidden'" />
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
        </div>
      </div>

      <!-- The pinned dock: page-tone band with a top rule; depth is a line, not a shadow. -->
      <div
        ref="transportCard"
        :aria-label="t('dock.region')"
        role="region"
        class="bg-background border-border sticky bottom-0 z-10 flex flex-col border-t xl:h-(--dock-h)"
      >
        <TransportBar
          ref="transport"
          v-model="position"
          v-model:autoplay="autoplay"
          :same-view="sameView"
          :player="player"
          :events="events"
          :clock-us="replayState.clockUs"
          @keys="sheetOpen = true"
        >
          <template #trailing>
            <!-- The minimized Ask AI tour docks here as a segment, next to the ASK AI word. -->
            <div id="dock-tour" class="contents" />
            <AskAiLauncher ref="launcher" :open="askOpen" @toggle="toggleAsk" />
          </template>
        </TransportBar>
      </div>
      <ShortcutSheet v-model:open="sheetOpen" />
    </main>
  </TooltipProvider>
</template>
