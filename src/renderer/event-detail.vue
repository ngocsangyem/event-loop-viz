<script setup lang="ts">
import { computed } from 'vue'
import { explainEvent } from '../player/explain-event'
import type { TraceEvent } from '../trace/trace-event'
import { Button } from '@/components/ui/button'

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
  <aside
    v-if="event && explanation"
    aria-label="Event detail"
    data-testid="event-detail"
    class="flex min-w-0 flex-col gap-2 text-sm"
  >
    <h2 class="font-mono text-sm font-medium">
      #{{ event.seq }} {{ event.k }}{{ event.visible ? '' : ' (bookkeeping)' }}
    </h2>
    <p data-testid="event-explanation" class="text-muted-foreground">{{ explanation.text }}</p>
    <dl class="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2 text-xs">
      <dt class="text-muted-foreground">Spec step</dt>
      <dd>
        <a
          data-testid="event-spec-link"
          class="text-primary underline underline-offset-4"
          :href="explanation.spec.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ explanation.spec.label }}</a
        >
      </dd>
      <dt class="text-muted-foreground">Payload</dt>
      <dd class="min-w-0">
        <pre data-testid="event-payload" class="bg-muted max-h-48 overflow-auto rounded-md p-2 font-mono">{{ payload }}</pre>
      </dd>
      <dt class="text-muted-foreground">Source</dt>
      <dd data-testid="event-source">{{ sourceLine ?? 'no source location' }}</dd>
      <dt class="text-muted-foreground">Cause</dt>
      <dd data-testid="event-cause">
        <Button v-if="cause" variant="outline" size="xs" class="font-mono" @click="emit('select', cause.seq)">
          #{{ cause.seq }} {{ cause.k }}
        </Button>
        <template v-else>none (started by the host)</template>
      </dd>
    </dl>
  </aside>
</template>
