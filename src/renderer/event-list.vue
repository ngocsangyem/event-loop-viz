<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { EVENT_FAMILIES, eventFamily } from '../player/event-family'
import type { EventFamily } from '../player/event-family'
import type { TraceEvent } from '../trace/trace-event'
import { indexOfSeq, visibleWindow } from './virtual-window'

const props = defineProps<{ events: readonly TraceEvent[] }>()
/** Playhead: the selected event. Clicking a row moves it there. */
const position = defineModel<number>({ required: true })
/** Reveals Bookkeeping Events in the list and makes them steppable (the parent follows this). */
const showAll = defineModel<boolean>('showAll', { required: true })

const hidden = ref<ReadonlySet<EventFamily>>(new Set())

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
const scroller = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

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
  <section aria-label="Events">
    <div role="group" aria-label="Filter by family" data-testid="family-filters">
      <button
        v-for="family in EVENT_FAMILIES"
        :key="family"
        type="button"
        :data-family="family"
        :aria-pressed="!hidden.has(family)"
        @click="toggleFamily(family)"
      >
        {{ family }}
      </button>
      <label>
        <input v-model="showAll" type="checkbox" />
        Show all events
      </label>
    </div>
    <div
      ref="scroller"
      data-testid="event-list-scroller"
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
          <button type="button" @click="position = event.seq">
            {{ event.seq }} {{ event.k }}
          </button>
        </li>
      </ol>
    </div>
  </section>
</template>
