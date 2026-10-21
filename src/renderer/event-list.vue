<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { EVENT_FAMILIES, eventFamily } from '../player/event-family'
import type { EventFamily } from '../player/event-family'
import type { TraceEvent } from '../trace/trace-event'
import { indexOfSeq, visibleWindow } from './virtual-window'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

const props = defineProps<{ events: readonly TraceEvent[] }>()
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

const rows = computed(() =>
  props.events.filter((e) => (showAll.value || e.visible) && !hidden.value.has(eventFamily(e.k))),
)

// Long Runs render only the rows in view (fixed row height), so a 200k-event Trace stays light.
const ROW_HEIGHT = 24
const VIEWPORT_HEIGHT = 320
const scroller = useTemplateRef<HTMLElement>('scroller')
const scrollTop = shallowRef(0)

const rowWindow = computed(() =>
  visibleWindow({
    total: rows.value.length,
    rowHeight: ROW_HEIGHT,
    viewportHeight: VIEWPORT_HEIGHT,
    scrollTop: scrollTop.value,
    overscan: 10,
  }),
)
const shownRows = computed(() => rows.value.slice(rowWindow.value.start, rowWindow.value.end))
const scrollerStyle = computed(() =>
  rowWindow.value.virtual ? { height: `${VIEWPORT_HEIGHT}px`, overflowY: 'auto' as const } : undefined,
)
// Padding stands in for the rows that are not rendered, keeping the scrollbar the full length.
const listStyle = computed(() =>
  rowWindow.value.virtual
    ? {
        paddingTop: `${rowWindow.value.start * ROW_HEIGHT}px`,
        paddingBottom: `${(rows.value.length - rowWindow.value.end) * ROW_HEIGHT}px`,
      }
    : undefined,
)
const rowStyle = computed(() =>
  rowWindow.value.virtual ? { height: `${ROW_HEIGHT}px`, overflow: 'hidden' } : undefined,
)

// Keep the playhead in view when it moves (stepping, scrubbing, playback).
watch([position, () => rows.value.length], async () => {
  const el = scroller.value
  if (!el || !rowWindow.value.virtual) return
  const index = indexOfSeq(rows.value, position.value)
  if (index < 0) return
  const top = index * ROW_HEIGHT
  if (top < el.scrollTop || top + ROW_HEIGHT > el.scrollTop + VIEWPORT_HEIGHT) {
    el.scrollTop = Math.max(top - VIEWPORT_HEIGHT / 2, 0)
    await nextTick()
    scrollTop.value = el.scrollTop
  }
})
</script>

<template>
  <section aria-label="Events" class="flex min-w-0 flex-col gap-2">
    <div
      role="group"
      aria-label="Filter by family"
      data-testid="family-filters"
      class="flex flex-wrap items-center gap-1"
    >
      <Toggle
        v-for="family in EVENT_FAMILIES"
        :key="family"
        size="sm"
        variant="outline"
        :data-family="family"
        :model-value="!hidden.has(family)"
        @update:model-value="toggleFamily(family)"
      >
        {{ family }}
      </Toggle>
      <div class="ml-auto flex items-center gap-2">
        <Checkbox id="show-all-events" v-model="showAll" />
        <Label for="show-all-events" class="text-xs">Show all events</Label>
      </div>
    </div>
    <div
      ref="scroller"
      data-testid="event-list-scroller"
      class="max-h-80 overflow-auto rounded-md border"
      :style="scrollerStyle"
      @scroll="scrollTop = ($event.target as HTMLElement).scrollTop"
    >
      <ol data-testid="event-list" :data-total="rows.length" :style="listStyle">
        <li
          v-for="event in shownRows"
          :key="event.seq"
          :data-seq="event.seq"
          :data-family="eventFamily(event.k)"
          :data-visible="event.visible"
          :aria-current="event.seq === position"
          :style="rowStyle"
        >
          <button
            type="button"
            :class="
              cn(
                'hover:bg-muted flex h-6 w-full items-center gap-2 px-2 text-left font-mono text-xs',
                event.seq === position && 'bg-primary/10 text-foreground font-medium',
                !event.visible && 'text-muted-foreground',
              )
            "
            @click="position = event.seq"
          >
            {{ event.seq }} {{ event.k }}
          </button>
        </li>
      </ol>
    </div>
  </section>
</template>
