<script setup lang="ts">
import { computed, ref } from 'vue'
import { runScript } from '@/runner/run-script'
import { deriveObservableOutput } from '@/trace/derive-observable-output'
import type { ObservableEntry } from '@/trace/observable-output'
import type { Trace } from '@/trace/trace-event'

const script = ref("setTimeout(() => console.log('timer'), 10)\nconsole.log('sync')")
const trace = ref<Trace | null>(null)
const syntaxError = ref<string | null>(null)
/** Index of the current event in the Trace. The Trace is immutable; position is the only state. */
const position = ref(0)

const events = computed(() => trace.value?.events ?? [])
const lastPosition = computed(() => events.value.length - 1)
// Derived from the Trace prefix so the console can never disagree with the event list.
const consoleEntries = computed(() =>
  deriveObservableOutput(events.value.slice(0, position.value + 1)),
)

function describeEntry(entry: ObservableEntry): string {
  return entry.kind === 'console'
    ? `${entry.level}: ${entry.text}`
    : `${entry.kind}: ${entry.message}`
}

async function run() {
  const result = await runScript(script.value)
  syntaxError.value = null
  trace.value = null
  position.value = 0
  if (result.kind === 'ran') trace.value = result.trace
  else if (result.kind === 'syntax-error') {
    syntaxError.value = `${result.message} (line ${result.line}, column ${result.column})`
  } else syntaxError.value = 'The run was stopped by the watchdog.'
}
</script>

<template>
  <main>
    <label for="script">Script</label>
    <textarea id="script" v-model="script" rows="8" cols="80" />
    <button type="button" @click="run">Run</button>
    <p v-if="syntaxError" role="alert">{{ syntaxError }}</p>

    <template v-if="trace">
      <button type="button" :disabled="position <= 0" @click="position--">Prev</button>
      <button type="button" :disabled="position >= lastPosition" @click="position++">Next</button>

      <ol data-testid="event-list">
        <li
          v-for="event in events"
          :key="event.seq"
          :data-seq="event.seq"
          :aria-current="event.seq === position"
        >
          {{ event.seq }} {{ event.k }}
        </li>
      </ol>

      <ul data-testid="console-panel">
        <li v-for="(entry, i) in consoleEntries" :key="i">{{ describeEntry(entry) }}</li>
      </ul>
    </template>
  </main>
</template>
