<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Player } from '../player/player'
import type { TraceEvent } from '../trace/trace-event'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { formatVirtualMs } from './scene/timer-shelf-model'
import { stepProgressOf } from './step-progress'
import TimelineScrubber from './timeline-scrubber.vue'
import TransportControlButton from './transport-control-button.vue'
import { BACK_CONTROLS, FORWARD_CONTROLS } from './transport-controls'
import { SPEEDS, usePlayback } from './use-playback'
import type { SameView, Speed } from './use-playback'
import { useStepSentence } from './use-step-sentence'
import { useTraceNavigation } from './use-trace-navigation'
import { useTransportShortcuts } from './use-transport-shortcuts'

const { t } = useI18n()

const props = defineProps<{
  player: Player | null
  events: readonly TraceEvent[]
  /** Lets playback pass over steps that change nothing on screen. */
  sameView?: SameView
  /** Virtual Clock at the playhead, microseconds; printed at the end of the scrubber row. */
  clockUs: number
}>()
const position = defineModel<number>({ required: true })
/** Start playing as soon as a Run produces a Trace. */
const autoplay = defineModel<boolean>('autoplay', { required: true })
const emit = defineEmits<{ keys: [] }>()

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

const progress = computed(() => stepProgressOf(props.events, position.value))
const clock = computed(() => formatVirtualMs(props.clockUs))
const sentence = useStepSentence(() => props.events, () => position.value)
const edge = (control: { side: 'start' | 'end' }) => (control.side === 'start' ? atStart.value : atEnd.value)

/** The speed Select works in strings; playback keeps the number. */
const speedText = computed({
  get: () => String(speed.value),
  set: (value: string) => (speed.value = Number(value) as Speed),
})
</script>

<template>
  <!-- Two rows (DESIGN.md · Control dock): where the playhead is, then what moves it. -->
  <div
    ref="toolbar"
    role="toolbar"
    :aria-label="t('transport.region')"
    data-testid="transport-bar"
    class="flex min-h-0 flex-1 flex-col"
  >
    <div :class="['flex h-[38px] shrink-0 items-center gap-4 px-5 max-sm:px-3', !player && 'opacity-40']">
      <span class="text-foreground min-w-[132px] shrink-0 font-mono text-xs leading-none font-medium tracking-[0.02em] tabular-nums uppercase max-sm:hidden" data-testid="dock-step">
        {{ t('caption.step', progress) }}
      </span>
      <TimelineScrubber v-model="position" class="min-w-0 flex-1" :player="player" :events="events" @scrub="pause" />
      <span class="text-muted-foreground shrink-0 font-mono text-xs leading-none tabular-nums uppercase max-sm:hidden" data-testid="dock-clock">
        {{ t('dock.clock') }} <span class="normal-case">{{ clock }}</span>
      </span>
    </div>
    <div class="border-border-soft flex min-h-0 flex-1 flex-wrap items-center gap-0.5 border-t px-3 max-sm:gap-1 xl:flex-nowrap">
      <TransportControlButton
        v-for="control in BACK_CONTROLS"
        :key="control.id"
        v-bind="control.props"
        :label="t(control.label)"
        :word="t(control.word)"
        :disabled="edge(control)"
        @press="control.run(nav)"
      />
      <!-- The only filled control: playing is the primary action of a replay. -->
      <Button
        size="lg"
        hotkey="␣"
        class="min-w-24 max-sm:h-[52px] max-sm:min-w-0 max-sm:flex-1"
        :disabled="!player"
        :aria-pressed="playing"
        data-control="play"
        @click="toggle"
      >
        {{ playing ? t('transport.pause') : t('transport.play') }}
      </Button>
      <TransportControlButton
        v-for="control in FORWARD_CONTROLS"
        :key="control.id"
        v-bind="control.props"
        :label="t(control.label)"
        :word="t(control.word)"
        :disabled="edge(control)"
        @press="control.run(nav)"
      />
      <p
        class="text-foreground-2 hidden min-w-0 flex-1 truncate px-4 font-sans text-[13px] xl:block"
        :title="sentence || t('dock.lastEvent')"
        data-testid="dock-last-event"
      >
        {{ player ? sentence : t('dock.noTrace') }}
      </p>
      <div class="ml-auto flex items-center gap-0.5 max-sm:w-full max-sm:flex-wrap max-sm:justify-end">
        <Switch
          v-model="autoplay"
          class="max-sm:h-11"
          data-control="autoplay"
          :title="t('transport.autostartHint')"
          :label="t('transport.autostart')"
          :on-label="t('switch.on')"
          :off-label="t('switch.off')"
        />
        <Select v-model="speedText" :disabled="!player">
          <SelectTrigger size="sm" :aria-label="t('transport.speed')" class="w-20 max-sm:h-11!">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="s in SPEEDS" :key="s" :value="String(s)">{{ s }}×</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" size="lg" hotkey="?" data-control="keys" class="max-xl:hidden" @click="emit('keys')">
          {{ t('dock.keys') }}
        </Button>
        <div class="bg-border mx-2 h-7 w-px shrink-0 max-sm:hidden" aria-hidden="true" />
        <slot name="trailing" />
      </div>
    </div>
  </div>
</template>
