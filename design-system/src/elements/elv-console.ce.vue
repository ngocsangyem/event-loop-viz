<script setup lang="ts">
/**
 * Console output (DESIGN.md · Console line): a grid of `36px tag | text | meta` in mono 12.5/22.
 * Levels: `log` LOG ink-3 · `info` INF ink-2 · `warn` WRN yellow on its soft fill · `error` ERR red
 * on its soft fill · `rejection` REJ. An uncaught error or an unhandled rejection adds its label
 * and a 2px red rule. `repeat` collapses identical lines to `×498`. New lines reveal (opacity +
 * 4px rise); reduced motion shows them at once.
 *
 * `lines` takes an array as a DOM property, or the same array as a JSON string attribute.
 */
import { computed } from 'vue'
import { parseListProp } from '../parse-list-prop'

export interface ConsoleLine {
  level: 'log' | 'info' | 'warn' | 'error' | 'rejection'
  /** The printed value, as console.log would format it. */
  text: string
  /** Source line that printed it; shown as L<line> in the meta column. */
  line?: number
  /** How many identical lines this row stands for; shown as ×N when above 1. */
  repeat?: number
  /** An error nothing caught: adds the Uncaught label and red rule. */
  uncaught?: boolean
}

const props = withDefaults(
  defineProps<{
    lines?: ConsoleLine[] | string
    /** Text shown when nothing has printed yet. */
    empty?: string
  }>(),
  { lines: () => [], empty: 'No output yet' },
)

const rows = computed(() => parseListProp<ConsoleLine>(props.lines))
const TAGS = { log: 'LOG', info: 'INF', warn: 'WRN', error: 'ERR', rejection: 'REJ' } as const
const flag = (l: ConsoleLine) =>
  l.level === 'rejection' ? 'Unhandled rejection' : l.level === 'error' && l.uncaught ? 'Uncaught' : ''
</script>

<template>
  <div class="console">
    <p v-if="rows.length === 0" class="empty">{{ empty }}</p>
    <TransitionGroup tag="ol" name="line" class="lines">
      <li
        v-for="(l, i) in rows"
        :key="i"
        class="row"
        :data-level="l.level"
        :data-flagged="flag(l) ? '' : undefined"
      >
        <span class="tag">{{ TAGS[l.level] ?? 'LOG' }}</span>
        <span class="text"><span v-if="flag(l)" class="flag">{{ flag(l) }}</span>{{ l.text }}</span>
        <span class="meta">
          <span v-if="(l.repeat ?? 1) > 1" class="repeat">×{{ l.repeat }}</span>
          <span v-if="l.line !== undefined">L{{ l.line }}</span>
        </span>
      </li>
    </TransitionGroup>
  </div>
</template>

<style>
:host {
  display: block;
  min-width: 0;
}
.console {
  font: 400 var(--text-item) / 22px var(--font-mono);
  font-variant-ligatures: none;
  color: var(--color-ink-2);
}
.empty {
  margin: 0;
  padding: 8px 0;
  text-align: center;
  font-size: var(--text-meta);
  color: var(--color-ink-3);
}
.lines {
  position: relative;
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 8px;
  padding: 0 8px;
  border-bottom: 1px solid var(--color-line-soft);
}
.row:last-child {
  border-bottom: 0;
}
.tag {
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  color: var(--color-ink-3);
}
.text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.meta {
  display: flex;
  gap: 8px;
  font-size: var(--text-meta);
  color: var(--color-ink-3);
  font-variant-numeric: tabular-nums;
}
.repeat {
  color: var(--color-ink-2);
}
.row[data-level='log'] .text {
  color: var(--color-ink);
}
.row[data-level='info'] .tag {
  color: var(--color-ink-2);
}
.row[data-level='warn'] {
  background: var(--warn-soft);
}
.row[data-level='warn'] .tag,
.row[data-level='warn'] .text {
  color: var(--warn);
}
.row[data-level='error'],
.row[data-level='rejection'] {
  background: var(--error-soft);
}
.row[data-level='error'] .tag,
.row[data-level='error'] .text,
.row[data-level='rejection'] .tag,
.row[data-level='rejection'] .text {
  color: var(--error);
}
.row[data-flagged] {
  box-shadow: inset 2px 0 0 var(--error);
}
.flag {
  margin-right: 8px;
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}
@media (prefers-reduced-motion: no-preference) {
  .line-enter-active {
    transition:
      transform var(--motion-base) var(--ease-out),
      opacity var(--motion-base) var(--ease-out);
  }
  .line-enter-from {
    opacity: 0;
    transform: translateY(4px);
  }
}
</style>
