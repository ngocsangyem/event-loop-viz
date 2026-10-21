<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { explainEvent, phrasesFor } from '../player/explain-event'
import type { ExplainLocale } from '../player/explain-event'
import { EVENT_FAMILIES, eventFamily } from '../player/event-family'
import type { EventFamily } from '../player/event-family'
import type { TraceEvent } from '../trace/trace-event'
import { buildEventRows, rowIndexOfSeq, taskTurnsOf } from './trace-event-rows'
import { eventTag } from './trace-event-tag'
import { EVENT_ROW_HEIGHT, visibleWindow } from './virtual-window'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

const props = defineProps<{ events: readonly TraceEvent[] }>()
const { t, locale } = useI18n()
/** Playhead: the selected event. Clicking a row moves it there. */
const position = defineModel<number>({ required: true })
/** Reveals Bookkeeping Events in the list and makes them steppable (the parent follows this). */
const showAll = defineModel<boolean>('showAll', { required: true })

const hidden = shallowRef<ReadonlySet<EventFamily>>(new Set())

function toggleFamily(family: EventFamily) {
  const next = new Set(hidden.value)
  if (!next.delete(family)) next.add(family)
  hidden.value = next
}

const events = computed(() => props.events.filter((e) => (showAll.value || e.visible) && !hidden.value.has(eventFamily(e.k))))
const turns = computed(() => taskTurnsOf(props.events))
/** Event lines with a header before each Task's turn; every line is `EVENT_ROW_HEIGHT` tall. */
const lines = computed(() => buildEventRows(events.value, turns.value))

// Long Runs render only the lines in view (fixed line height), so a 200k-event Trace stays light.
const scroller = useTemplateRef<HTMLElement>('scroller')
const { height: measured } = useElementSize(scroller)
const viewportHeight = computed(() => measured.value || 400)
const scrollTop = shallowRef(0)

const lineWindow = computed(() =>
  visibleWindow({
    total: lines.value.length,
    rowHeight: EVENT_ROW_HEIGHT,
    viewportHeight: viewportHeight.value,
    scrollTop: scrollTop.value,
    overscan: 10,
  }),
)
const shownLines = computed(() => lines.value.slice(lineWindow.value.start, lineWindow.value.end))
// Padding stands in for the lines that are not rendered, keeping the scrollbar the full length.
const listStyle = computed(() =>
  lineWindow.value.virtual
    ? {
        paddingTop: `${lineWindow.value.start * EVENT_ROW_HEIGHT}px`,
        paddingBottom: `${(lines.value.length - lineWindow.value.end) * EVENT_ROW_HEIGHT}px`,
      }
    : undefined,
)

/** One sentence per event, computed only for lines on screen and kept until the language or Trace changes. */
const sentences = new Map<number, string>()
watch([() => props.events, locale], () => sentences.clear())
function sentenceOf(event: TraceEvent): string {
  let text = sentences.get(event.seq)
  if (text === undefined) {
    text = explainEvent(event, props.events, phrasesFor(locale.value as ExplainLocale)).text
    sentences.set(event.seq, text)
  }
  return text
}

const sourceName = (source: string | null) => (source ? t(`eventList.source.${source}`) : '')

// Keep the playhead in view when it moves (stepping, scrubbing, playback).
watch([position, () => lines.value.length], async () => {
  const el = scroller.value
  if (!el) return
  const index = rowIndexOfSeq(lines.value, position.value)
  if (index < 0) return
  // Include the group header above the first line of a turn so the turn's name stays visible.
  const above = lines.value[index - 1]?.type === 'group' ? 1 : 0
  const top = (index - above) * EVENT_ROW_HEIGHT
  const bottom = (index + 1) * EVENT_ROW_HEIGHT
  if (top < el.scrollTop || bottom > el.scrollTop + el.clientHeight) {
    el.scrollTop = Math.max(top - el.clientHeight / 2, 0)
    await nextTick()
    scrollTop.value = el.scrollTop
  }
})
</script>

<template>
  <section :aria-label="t('eventList.region')" class="flex min-h-0 min-w-0 flex-1 flex-col">
    <h2 class="label-mono border-border-soft flex h-[38px] shrink-0 items-center gap-2 border-b px-5">
      {{ t('rail.events') }}
      <span class="text-muted-foreground tabular-nums" data-testid="event-count">{{ events.length }}</span>
    </h2>
    <div
      role="group"
      :aria-label="t('eventList.filter')"
      data-testid="family-filters"
      class="border-border-soft flex shrink-0 flex-wrap items-center gap-1 border-b px-5 py-1.5"
    >
      <Toggle
        v-for="family in EVENT_FAMILIES"
        :key="family"
        size="sm"
        variant="outline"
        class="h-6 min-w-0 px-2 text-[11px]"
        :data-family="family"
        :model-value="!hidden.has(family)"
        @update:model-value="toggleFamily(family)"
      >
        {{ family }}
      </Toggle>
      <div class="ml-auto flex items-center gap-2">
        <Checkbox id="show-all-events" v-model="showAll" />
        <Label for="show-all-events" class="label-mono">{{ t('eventList.showAll') }}</Label>
      </div>
    </div>
    <div
      ref="scroller"
      data-testid="event-list-scroller"
      class="min-h-0 flex-1 overflow-y-auto max-xl:max-h-96"
      @scroll="scrollTop = ($event.target as HTMLElement).scrollTop"
    >
      <ol data-testid="event-list" :data-total="events.length" :style="listStyle">
        <template v-for="line in shownLines" :key="line.type === 'group' ? line.key : line.event.seq">
          <li
            v-if="line.type === 'group'"
            data-group
            class="text-muted-foreground border-border-soft box-border h-[31px] overflow-hidden border-b px-5 pt-3 pb-1 font-mono text-[11px] leading-[14px] font-medium tracking-[0.02em] whitespace-nowrap uppercase"
          >
            {{ t('eventList.group', { id: `#${line.taskId.replace(/^task-/, '')}`, source: sourceName(line.source) }) }}
          </li>
          <li
            v-else
            :data-seq="line.event.seq"
            :data-kind="line.event.k"
            :data-family="eventFamily(line.event.k)"
            :data-visible="line.event.visible"
            :aria-current="line.event.seq === position ? 'step' : undefined"
          >
            <button
              type="button"
              :title="`${line.event.k}: ${sentenceOf(line.event)}`"
              :class="
                cn(
                  'hover:bg-accent border-border-soft box-border grid h-[31px] w-full grid-cols-[44px_44px_minmax(0,1fr)] items-center gap-2 border-b pr-5 pl-3 text-left transition-colors duration-(--motion-line)',
                  line.event.seq === position && 'bg-accent shadow-[inset_2px_0_0_var(--brand)]',
                )
              "
              @click="position = line.event.seq"
            >
              <span class="text-muted-foreground text-right font-mono text-[11.5px] leading-[30px] tabular-nums">{{ line.event.seq }}</span>
              <span :class="['font-mono text-[11px] leading-[30px] font-medium tracking-[0.02em]', eventTag(line.event).className]">{{ eventTag(line.event).label }}</span>
              <span
                :class="[
                  'truncate font-sans text-[13px] leading-[30px]',
                  line.event.seq === position ? 'text-foreground font-medium' : line.event.seq > position || !line.event.visible ? 'text-muted-foreground' : 'text-foreground',
                ]"
              >{{ sentenceOf(line.event) }}</span>
            </button>
          </li>
        </template>
      </ol>
    </div>
  </section>
</template>
