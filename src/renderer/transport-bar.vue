<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import type { Player } from '../player/player'
import type { TraceEvent } from '../trace/trace-event'
import TimelineScrubber from './timeline-scrubber.vue'
import { SPEEDS, usePlayback } from './use-playback'
import {
  ChevronFirstIcon, ChevronLastIcon, ChevronsLeftIcon, ChevronsRightIcon, PauseIcon, PlayIcon,
  SkipBackIcon, SkipForwardIcon, StepBackIcon, StepForwardIcon,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps<{ player: Player | null; events: readonly TraceEvent[] }>()
const position = defineModel<number>({ required: true })

const { playing, speed, toggle, pause } = usePlayback(
  computed(() => props.player),
  position,
)

const atStart = computed(() => !props.player || position.value <= props.player.first())
const atEnd = computed(() => !props.player || position.value >= props.player.last())

function step(direction: 'next' | 'prev') {
  if (props.player) position.value = props.player[direction](position.value)
}

function jump(edge: 'first' | 'last') {
  if (props.player) position.value = props.player[edge]()
}

type Unit = 'Tick' | 'Task'

/** Tick/Task jumps clamp at the Trace ends, like single steps. */
function jumpBy(unit: Unit, direction: 'next' | 'prev') {
  if (props.player) position.value = props.player[`${direction}${unit}`](position.value)
}


const toolbar = useTemplateRef<HTMLElement>('toolbar')
/** Lets the app hand keyboard focus to the controls once a Trace exists. */
defineExpose({
  // Next is disabled when the Trace opens at its end; fall back to the first enabled control.
  focusStep: () =>
    toolbar.value
      ?.querySelector<HTMLButtonElement>('[data-control=next]:enabled, [data-control]:enabled')
      ?.focus(),
})

interface Control {
  id: string
  label: string
  icon: typeof PlayIcon
  shortcut: string
  disabled: () => boolean
  run: () => void
}

/** Back controls, then forward controls; Play/Pause sits between them. */
const BACK: Control[] = [
  { id: 'start', label: 'Go to start', icon: ChevronFirstIcon, shortcut: 'Home', disabled: () => atStart.value, run: () => jump('first') },
  { id: 'back-task', label: 'Back one Task', icon: ChevronsLeftIcon, shortcut: 'Alt+←', disabled: () => atStart.value, run: () => jumpBy('Task', 'prev') },
  { id: 'back-tick', label: 'Back one Tick', icon: SkipBackIcon, shortcut: 'Shift+←', disabled: () => atStart.value, run: () => jumpBy('Tick', 'prev') },
  { id: 'prev', label: 'Prev', icon: StepBackIcon, shortcut: '←', disabled: () => atStart.value, run: () => step('prev') },
]
const FORWARD: Control[] = [
  { id: 'next', label: 'Next', icon: StepForwardIcon, shortcut: '→', disabled: () => atEnd.value, run: () => step('next') },
  { id: 'forward-tick', label: 'Forward one Tick', icon: SkipForwardIcon, shortcut: 'Shift+→', disabled: () => atEnd.value, run: () => jumpBy('Tick', 'next') },
  { id: 'forward-task', label: 'Forward one Task', icon: ChevronsRightIcon, shortcut: 'Alt+→', disabled: () => atEnd.value, run: () => jumpBy('Task', 'next') },
  { id: 'end', label: 'Go to end', icon: ChevronLastIcon, shortcut: 'End', disabled: () => atEnd.value, run: () => jump('last') },
]

const speedText = computed({
  get: () => String(speed.value),
  set: (value: string) => (speed.value = Number(value) as typeof speed.value),
})

/** Typing in the editor or a field must never trigger transport shortcuts. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** Space activates a focused control; it only toggles playback when nothing else owns it. */
function ownsSpace(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && !!el.closest('button, a[href], summary, [role=button]')
}

/** Menus, listboxes, toggle groups and sliders use arrows, Home and End for their own focus. */
const OWN_KEYS_WIDGETS = '[role=menu], [role=listbox], [role=group], [role=radiogroup], [role=slider], [role=combobox]'

function onKeydown(event: KeyboardEvent) {
  if (!props.player || event.defaultPrevented || isTyping(event.target)) return
  if ((event.target as HTMLElement | null)?.closest?.(OWN_KEYS_WIDGETS)) return
  // Ctrl/Cmd belong to the browser and OS; Shift and Alt alone select the jump unit.
  if (event.ctrlKey || event.metaKey || (event.shiftKey && event.altKey)) return
  const modified = event.shiftKey || event.altKey
  const unit: Unit = event.shiftKey ? 'Tick' : 'Task'
  const actions: Record<string, () => void> = modified
    ? {
        ArrowRight: () => jumpBy(unit, 'next'),
        ArrowLeft: () => jumpBy(unit, 'prev'),
      }
    : {
        ' ': toggle,
        ArrowRight: () => step('next'),
        ArrowLeft: () => step('prev'),
        Home: () => jump('first'),
        End: () => jump('last'),
      }
  if (event.key === ' ' && ownsSpace(event.target)) return
  const action = actions[event.key]
  if (!action) return
  event.preventDefault()
  // Manual navigation takes over from autoplay, except the play/pause toggle itself.
  if (event.key !== ' ') pause()
  action()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    ref="toolbar"
    role="toolbar"
    aria-label="Playback"
    data-testid="transport-bar"
    class="flex flex-col gap-1"
  >
    <div class="flex flex-wrap items-center gap-1">
      <template v-for="group in [BACK, null, FORWARD]" :key="group ? group[0]!.id : 'play'">
        <Button
          v-if="!group"
          size="sm"
          class="min-w-20 max-sm:h-11!"
          :disabled="!player"
          :aria-pressed="playing"
          data-control="play"
          @click="toggle"
        >
          <PauseIcon v-if="playing" />
          <PlayIcon v-else />
          {{ playing ? 'Pause' : 'Play' }}
        </Button>
        <Tooltip v-for="control in group ?? []" v-else :key="control.id">
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="max-sm:size-11!"
              :aria-label="control.label"
              :data-control="control.id"
              :disabled="!player || control.disabled()"
              @click="control.run"
            >
              <component :is="control.icon" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ control.label }} · {{ control.shortcut }}</TooltipContent>
        </Tooltip>
      </template>
      <Separator orientation="vertical" class="mx-1 !h-5" />
      <Select v-model="speedText" :disabled="!player">
        <SelectTrigger size="sm" aria-label="Speed" class="w-20 max-sm:h-11!">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in SPEEDS" :key="s" :value="String(s)">{{ s }}×</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <TimelineScrubber v-model="position" :player="player" :events="events" @scrub="pause" />
  </div>
</template>
