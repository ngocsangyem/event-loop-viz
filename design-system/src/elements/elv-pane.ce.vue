<script setup lang="ts">
/**
 * A ruled pane (DESIGN.md · Pane header, Focal hierarchy): a 38px header with an 8px concept-hue
 * square, a mono uppercase title, an optional count and a right-aligned state label, then the
 * pane body. `state="changed"` gives the pane its concept -soft tint and a 2px top rule in the
 * hue; `state="running"` labels a running Call Stack. Slots: default (body), `actions` (header end).
 */
import { computed } from 'vue'
import { hueVars } from '../concepts'
import type { Concept } from '../concepts'

const props = withDefaults(
  defineProps<{
    /** Pane title; shown in mono uppercase. */
    title: string
    /** Event-loop concept that picks the pane's hue. */
    concept?: Concept
    /** Item count shown after the title; omit for panes without a count. */
    count?: number
    /** Focal state of the pane at this step. */
    state?: 'idle' | 'changed' | 'running'
  }>(),
  { concept: undefined, count: undefined, state: 'idle' },
)

const style = computed(() => hueVars(props.concept))
const stateLabel = computed(() => (props.state === 'changed' ? 'CHANGED' : props.state === 'running' ? 'RUNNING' : ''))
</script>

<template>
  <section class="pane" :data-state="state" :style="style" role="region" :aria-label="title">
    <header class="head">
      <span class="hue" aria-hidden="true" />
      <h3 class="title">{{ title }}</h3>
      <span v-if="count !== undefined" class="count">{{ count }}</span>
      <span class="spacer" />
      <span v-if="stateLabel" class="state">{{ stateLabel }}</span>
      <slot name="actions" />
    </header>
    <div class="body">
      <slot />
    </div>
  </section>
</template>

<style>
:host {
  display: block;
  min-width: 0;
}
.pane {
  background: var(--color-bg);
  border: 1px solid var(--color-line);
  color: var(--color-ink);
  font-family: var(--font-sans);
  transition: background-color var(--motion-base) var(--ease-out);
}
.pane[data-state='changed'] {
  background: var(--hue-soft);
  box-shadow: inset 0 2px 0 var(--hue);
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-bottom: 1px solid var(--color-line-soft);
}
.hue {
  width: 8px;
  height: 8px;
  flex: none;
  background: var(--hue);
}
.title {
  margin: 0;
  font: 500 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
}
.count,
.state {
  font: 400 var(--text-meta) / 16px var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-3);
}
.state {
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  color: var(--hue);
}
.spacer {
  flex: 1;
}
.body {
  padding: 12px;
}
</style>
