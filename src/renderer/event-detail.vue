<script setup lang="ts">
import { computed } from 'vue'
import { explainEvent } from '../player/explain-event'
import type { TraceEvent } from '../trace/trace-event'

const props = defineProps<{ events: readonly TraceEvent[]; position: number }>()
const emit = defineEmits<{ select: [seq: number] }>()

const event = computed(() => props.events[props.position])
const explanation = computed(() => (event.value ? explainEvent(event.value, props.events) : null))
const cause = computed(() =>
  event.value?.cause === undefined ? undefined : props.events[event.value.cause],
)

/** Kind-specific fields only; the common ones are shown as their own rows. */
const payload = computed(() => {
  if (!event.value) return ''
  const common = new Set(['seq', 't', 'ref', 'loc', 'cause', 'visible'])
  const rest = Object.fromEntries(
    Object.entries(event.value).filter(([name]) => !common.has(name)),
  )
  return JSON.stringify(rest, null, 2)
})

const sourceLine = computed(() => {
  const loc = event.value?.loc
  return loc ? `line ${loc.line}, column ${loc.column}` : null
})
</script>

<template>
  <aside v-if="event && explanation" aria-label="Event detail" data-testid="event-detail">
    <h2>#{{ event.seq }} {{ event.k }}{{ event.visible ? '' : ' (bookkeeping)' }}</h2>
    <p data-testid="event-explanation">{{ explanation.text }}</p>
    <dl>
      <dt>Spec step</dt>
      <dd>
        <a
          data-testid="event-spec-link"
          :href="explanation.spec.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ explanation.spec.label }}</a
        >
      </dd>
      <dt>Payload</dt>
      <dd>
        <pre data-testid="event-payload">{{ payload }}</pre>
      </dd>
      <dt>Source</dt>
      <dd data-testid="event-source">{{ sourceLine ?? 'no source location' }}</dd>
      <dt>Cause</dt>
      <dd data-testid="event-cause">
        <button v-if="cause" type="button" @click="emit('select', cause.seq)">
          #{{ cause.seq }} {{ cause.k }}
        </button>
        <template v-else>none (started by the host)</template>
      </dd>
    </dl>
  </aside>
</template>
