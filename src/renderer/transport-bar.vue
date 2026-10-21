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
  icon: Component
  shortcut: string
  disabled: () => boolean
  run: () => void
}

/** Back controls sit before Play/Pause, forward controls after it. */
const BACK: Control[] = [
  { id: 'start', label: 'transport.start', icon: ChevronFirstIcon, shortcut: 'Home', disabled: () => atStart.value, run: () => nav.jump('first') },
  { id: 'back-task', label: 'transport.backTask', icon: ChevronsLeftIcon, shortcut: 'Alt+←', disabled: () => atStart.value, run: () => nav.jumpBy('Task', 'prev') },
  { id: 'back-tick', label: 'transport.backTick', icon: SkipBackIcon, shortcut: 'Shift+←', disabled: () => atStart.value, run: () => nav.jumpBy('Tick', 'prev') },
  { id: 'prev', label: 'transport.prev', icon: StepBackIcon, shortcut: '←', disabled: () => atStart.value, run: () => nav.step('prev') },
]
const FORWARD: Control[] = [
  { id: 'next', label: 'transport.next', icon: StepForwardIcon, shortcut: '→', disabled: () => atEnd.value, run: () => nav.step('next') },
  { id: 'forward-tick', label: 'transport.forwardTick', icon: SkipForwardIcon, shortcut: 'Shift+→', disabled: () => atEnd.value, run: () => nav.jumpBy('Tick', 'next') },
  { id: 'forward-task', label: 'transport.forwardTask', icon: ChevronsRightIcon, shortcut: 'Alt+→', disabled: () => atEnd.value, run: () => nav.jumpBy('Task', 'next') },
  { id: 'end', label: 'transport.end', icon: ChevronLastIcon, shortcut: 'End', disabled: () => atEnd.value, run: () => nav.jump('last') },
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
        :icon="control.icon"
        :shortcut="control.shortcut"
        :disabled="control.disabled()"
        @press="control.run"
      />
      <Button
        size="sm"
        class="min-w-20 max-sm:h-11!"
        :disabled="!player"
        :aria-pressed="playing"
        data-control="play"
        @click="toggle"
      >
        <PauseIcon v-if="playing" />
        <PlayIcon v-else />
        {{ playing ? t('transport.pause') : t('transport.play') }}
      </Button>
      <TransportControlButton
        v-for="control in FORWARD"
        :key="control.id"
        :id="control.id"
        :label="t(control.label)"
        :icon="control.icon"
        :shortcut="control.shortcut"
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
        <RepeatIcon />
        {{ t('transport.autostart') }}
      </Toggle>
    </div>
    <TimelineScrubber v-model="position" :player="player" :events="events" @scrub="pause" />
  </div>
</template>
