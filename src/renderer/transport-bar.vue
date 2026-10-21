<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Component } from 'vue'
import {
  ChevronFirstIcon, ChevronLastIcon, ChevronsLeftIcon, ChevronsRightIcon, PauseIcon, PlayIcon,
  RepeatIcon, SkipBackIcon, SkipForwardIcon, StepBackIcon, StepForwardIcon,
} from '@lucide/vue'
import type { Player } from '../player/player'
import type { TraceEvent } from '../trace/trace-event'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import TimelineScrubber from './timeline-scrubber.vue'
import TransportControlButton from './transport-control-button.vue'
import { SPEEDS, usePlayback } from './use-playback'
import type { SameView, Speed } from './use-playback'
import { useTraceNavigation } from './use-trace-navigation'
import { useTransportShortcuts } from './use-transport-shortcuts'

const { t } = useI18n()

const props = defineProps<{
  player: Player | null
  events: readonly TraceEvent[]
  /** Lets playback pass over steps that change nothing on screen. */
  sameView?: SameView
}>()
const position = defineModel<number>({ required: true })
/** Start playing as soon as a Run produces a Trace. */
const autoplay = defineModel<boolean>('autoplay', { required: true })

const { playing, speed, play, toggle, pause } = usePlayback(
  computed(() => props.player),
  position,
  () => props.sameView,
)
const nav = useTraceNavigation(() => props.player, position)
const { atStart, atEnd } = nav
useTransportShortcuts(nav, { enabled: () => props.player !== null, toggle, pause })

const toolbar = useTemplateRef<HTMLElement>('toolbar')
/** Lets the app start playback and hand keyboard focus to the controls once a Trace exists. */
defineExpose({
  play,
  pause,
  playing,
  speed,
  // Next is disabled when the Trace opens at its end; fall back to the first enabled control.
  focusStep: () =>
    toolbar.value
      ?.querySelector<HTMLButtonElement>('[data-control=next]:enabled, [data-control]:enabled')
      ?.focus(),
})

interface Control {
  id: string
  /** Message key of the control's name. */
  label: string
  /** Message key of the word printed on the control. */
  word: string
  icon: Component
  shortcut: string
  keyHint: string
  disabled: () => boolean
  run: () => void
}

/** Back controls sit before Play/Pause, forward controls after it. */
const BACK: Control[] = [
  { id: 'start', label: 'transport.start', word: 'transport.word.start', icon: ChevronFirstIcon, shortcut: 'Home', keyHint: '⇱', disabled: () => atStart.value, run: () => nav.jump('first') },
  { id: 'back-task', label: 'transport.backTask', word: 'transport.word.task', icon: ChevronsLeftIcon, shortcut: 'Alt+←', keyHint: '⌥←', disabled: () => atStart.value, run: () => nav.jumpBy('Task', 'prev') },
  { id: 'back-tick', label: 'transport.backTick', word: 'transport.word.tick', icon: SkipBackIcon, shortcut: 'Shift+←', keyHint: '⇧←', disabled: () => atStart.value, run: () => nav.jumpBy('Tick', 'prev') },
  { id: 'prev', label: 'transport.prev', word: 'transport.word.prev', icon: StepBackIcon, shortcut: '←', keyHint: '←', disabled: () => atStart.value, run: () => nav.step('prev') },
]
const FORWARD: Control[] = [
  { id: 'next', label: 'transport.next', word: 'transport.word.next', icon: StepForwardIcon, shortcut: '→', keyHint: '→', disabled: () => atEnd.value, run: () => nav.step('next') },
  { id: 'forward-tick', label: 'transport.forwardTick', word: 'transport.word.tick', icon: SkipForwardIcon, shortcut: 'Shift+→', keyHint: '⇧→', disabled: () => atEnd.value, run: () => nav.jumpBy('Tick', 'next') },
  { id: 'forward-task', label: 'transport.forwardTask', word: 'transport.word.task', icon: ChevronsRightIcon, shortcut: 'Alt+→', keyHint: '⌥→', disabled: () => atEnd.value, run: () => nav.jumpBy('Task', 'next') },
  { id: 'end', label: 'transport.end', word: 'transport.word.end', icon: ChevronLastIcon, shortcut: 'End', keyHint: '⇲', disabled: () => atEnd.value, run: () => nav.jump('last') },
]

/** The speed Select works in strings; playback keeps the number. */
const speedText = computed({
  get: () => String(speed.value),
  set: (value: string) => (speed.value = Number(value) as Speed),
})
</script>

<template>
  <div
    ref="toolbar"
    role="toolbar"
    :aria-label="t('transport.region')"
    data-testid="transport-bar"
    class="flex flex-col gap-1"
  >
    <div class="flex flex-wrap items-center gap-1">
      <TransportControlButton
        v-for="control in BACK"
        :key="control.id"
        :id="control.id"
        :label="t(control.label)"
        :word="t(control.word)"
        :icon="control.icon"
        :shortcut="control.shortcut"
        :key-hint="control.keyHint"
        :disabled="control.disabled()"
        @press="control.run"
      />
      <!-- The only filled control: playing is the primary action of a replay. -->
      <Button
        size="sm"
        class="min-w-24 gap-1.5 max-sm:h-11!"
        :disabled="!player"
        :aria-pressed="playing"
        data-control="play"
        @click="toggle"
      >
        <Kbd aria-hidden="true" class="text-primary-foreground/70 max-sm:hidden">␣</Kbd>
        <PauseIcon v-if="playing" class="sm:hidden" />
        <PlayIcon v-else class="sm:hidden" />
        {{ playing ? t('transport.pause') : t('transport.play') }}
      </Button>
      <TransportControlButton
        v-for="control in FORWARD"
        :key="control.id"
        :id="control.id"
        :label="t(control.label)"
        :word="t(control.word)"
        :icon="control.icon"
        :shortcut="control.shortcut"
        :key-hint="control.keyHint"
        :disabled="control.disabled()"
        @press="control.run"
      />
      <Separator orientation="vertical" class="mx-1 !h-5" />
      <Select v-model="speedText" :disabled="!player">
        <SelectTrigger size="sm" :aria-label="t('transport.speed')" class="w-20 max-sm:h-11!">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in SPEEDS" :key="s" :value="String(s)">{{ s }}×</SelectItem>
        </SelectContent>
      </Select>
      <Toggle
        v-model="autoplay"
        size="sm"
        variant="outline"
        class="max-sm:h-11!"
        data-control="autoplay"
        :title="t('transport.autostartHint')"
      >
        <RepeatIcon class="sm:hidden" />
        {{ t('transport.autostart') }}
      </Toggle>
    </div>
    <TimelineScrubber v-model="position" :player="player" :events="events" @scrub="pause" />
  </div>
</template>
