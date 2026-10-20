<script setup lang="ts">
import { computed, ref } from 'vue'
import { EVENT_FAMILIES, eventFamily } from '../player/event-family'
import type { EventFamily } from '../player/event-family'
import type { TraceEvent } from '../trace/trace-event'

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
    <ol data-testid="event-list">
      <li
        v-for="event in rows"
        :key="event.seq"
        :data-seq="event.seq"
        :data-family="eventFamily(event.k)"
        :data-visible="event.visible"
        :aria-current="event.seq === position"
      >
        <button type="button" @click="position = event.seq">{{ event.seq }} {{ event.k }}</button>
      </li>
    </ol>
  </section>
</template>
