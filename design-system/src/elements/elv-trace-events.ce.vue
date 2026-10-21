<script setup lang="ts">
/**
 * The Trace Events list (DESIGN.md · Why rail): grouped under `TICK n · TASK #n — <SOURCE>` mono
 * headers, rows read `n · TAG · text` with n and TAG in the event's concept hue and the text in
 * Inter. The `active` row has the hover-row fill and a 2px accent left rule; rows after it are ink-3
 * (they have not happened yet). Rows are buttons; a click emits `select` with the event number in
 * `event.detail[0]`. Slot `header` sits above the list (e.g. a SHOW ALL toggle).
 *
 * `groups` takes an array as a DOM property, or the same array as a JSON string attribute.
 */
import { computed } from 'vue'
import { hueVars } from '../concepts'
import type { Concept } from '../concepts'
import { parseListProp } from '../parse-list-prop'

export interface TraceEventItem {
  /** Event number within the Trace. */
  n: number
  /** Mono tag, e.g. `PUSH`, `JOB`, `LOG`. */
  tag: string
  concept?: Concept
  /** Plain-language description of the Trace Event. */
  text: string
}
export interface TraceEventGroup {
  /** Header text, e.g. `TICK 1 · TASK #1 — SCRIPT`. */
  label: string
  events: TraceEventItem[]
}

const props = withDefaults(
  defineProps<{
    groups?: TraceEventGroup[] | string
    /** Event number of the current step; later events render as future. */
    active?: number
  }>(),
  { groups: () => [], active: undefined },
)
const emit = defineEmits<{ select: [n: number] }>()

const list = computed(() => parseListProp<TraceEventGroup>(props.groups))
</script>

<template>
  <div class="trace">
    <div class="head"><slot name="header" /></div>
    <section v-for="g in list" :key="g.label" class="group">
      <h3 class="group-label">{{ g.label }}</h3>
      <ol class="rows">
        <li v-for="e in g.events" :key="e.n">
          <button
            type="button"
            class="row"
            :data-active="e.n === active ? '' : undefined"
            :data-future="active !== undefined && e.n > active ? '' : undefined"
            :style="hueVars(e.concept)"
            :aria-current="e.n === active ? 'step' : undefined"
            @click="emit('select', e.n)"
          >
            <span class="n">{{ e.n }}</span>
            <span class="tag">{{ e.tag }}</span>
            <span class="text">{{ e.text }}</span>
          </button>
        </li>
      </ol>
    </section>
  </div>
</template>

<style>
:host {
  display: block;
  min-width: 0;
}
.trace {
  color: var(--color-ink);
  font-family: var(--font-sans);
}
.head:empty {
  display: none;
}
.group-label {
  margin: 0;
  padding: 8px 8px 4px;
  font: 500 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-ink-2);
  border-bottom: 1px solid var(--color-line-soft);
}
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: grid;
  grid-template-columns: 28px 88px minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  width: 100%;
  padding: 4px 8px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-ink);
  font: 400 var(--text-row) / 20px var(--font-sans);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out);
}
.row:hover {
  background: var(--color-hover-row);
}
.row:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}
.row[data-active] {
  background: var(--color-hover-row);
  box-shadow: inset 2px 0 0 var(--brand);
}
.n,
.tag {
  font: 500 var(--text-meta) / 20px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--hue);
  font-variant-numeric: tabular-nums;
}
.row[data-future] .n,
.row[data-future] .tag,
.row[data-future] .text {
  color: var(--color-ink-3);
}
</style>
