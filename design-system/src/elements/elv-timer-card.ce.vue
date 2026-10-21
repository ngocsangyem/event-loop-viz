<script setup lang="ts">
/**
 * A Web APIs timer entry (DESIGN.md · Queue item, storyboard A "Timer #1 pane reveals"), tinted
 * with the `webapi` concept. Head row: mono id in the hue, the API (`setTimeout`), `L<line>` and a
 * state tag. Below: the delay, a thin progress bar of elapsed/delay on the Virtual Clock, the due
 * time, and the callback code in mono 12.5/18.
 *
 * States: `pending` (default) · `new` (soft fill + full-hue border + NEW tag) · `fired` (dashed
 * ghost, FIRED → TASK #n; the bar is full) · `interval` (repeats, shows ×N fires).
 *
 * Motion: the bar fill moves with transform only, inside no-preference.
 */
import { computed } from 'vue'
import { hueVars } from '../concepts'

const props = withDefaults(
  defineProps<{
    /** Mono id shown in the hue, e.g. `TIMER #1`. */
    label?: string
    api?: 'setTimeout' | 'setInterval'
    /** Requested delay in Virtual Clock ms. */
    delay?: number
    /** Virtual Clock ms elapsed since the timer was registered. */
    elapsed?: number
    /** Absolute Virtual Clock time the timer is due, shown as `due at N ms`. */
    due?: number
    /** Source line of the call. */
    line?: number
    /** Callback source text. */
    code?: string
    state?: 'pending' | 'new' | 'fired' | 'interval'
    /** For `fired`: the Task it became, e.g. `TASK #2`. */
    task?: string
    /** For `interval`: how many times it has fired. */
    fires?: number
  }>(),
  {
    label: 'TIMER #1', api: 'setTimeout', delay: 0, elapsed: 0, due: undefined, line: undefined,
    code: '', state: 'pending', task: '', fires: 0,
  },
)

const style = hueVars('webapi')
/** Fill 0..1; a zero-delay timer is full once it fired, empty before. */
const ratio = computed(() => {
  if (props.state === 'fired') return 1
  if (props.delay <= 0) return props.elapsed > 0 ? 1 : 0
  return Math.min(1, Math.max(0, props.elapsed / props.delay))
})
const percent = computed(() => Math.round(ratio.value * 100))
const tag = computed(() => {
  if (props.state === 'new') return 'NEW'
  if (props.state === 'fired') return props.task ? `FIRED → ${props.task}` : 'FIRED'
  if (props.state === 'interval') return `×${props.fires}`
  return ''
})
</script>

<template>
  <div class="card" :style="style" :data-state="state">
    <div class="meta">
      <span class="id">{{ label }}</span>
      <span class="kind">{{ api }}</span>
      <span class="spacer" />
      <span v-if="line !== undefined" class="line">L{{ line }}</span>
      <span v-if="tag" class="tag">{{ tag }}</span>
    </div>
    <div class="timing">
      <span>delay {{ delay }} ms</span>
      <span v-if="due !== undefined">due at {{ due }} ms</span>
    </div>
    <div
      class="bar"
      role="progressbar"
      :aria-label="`${api} ${elapsed} of ${delay} ms elapsed`"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percent"
    >
      <span class="fill" :style="{ transform: `scaleX(${ratio})` }" />
    </div>
    <code v-if="code" class="code">{{ code }}</code>
  </div>
</template>

<style>
:host {
  display: block;
  min-width: 0;
}
.card {
  display: grid;
  gap: 4px;
  padding: 6px 10px;
  font-family: var(--font-sans);
  color: var(--color-ink);
  background: var(--color-bg-raised);
  border: 1px solid var(--color-line-soft);
  box-shadow: inset 2px 0 0 var(--hue);
}
.card[data-state='new'] {
  background: var(--hue-soft);
  border-color: var(--hue);
}
.card[data-state='fired'] {
  background: transparent;
  border: 1px dashed var(--color-line);
  box-shadow: none;
  color: var(--color-ink-3);
}
.meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.id,
.line,
.tag {
  font: 500 11.5px / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
}
.id,
.tag {
  color: var(--hue);
}
.card[data-state='fired'] .id,
.card[data-state='fired'] .tag {
  color: var(--color-ink-3);
}
.kind {
  font: 400 var(--text-item) / 16px var(--font-mono);
  color: var(--color-ink-2);
}
.line {
  font-weight: 400;
  color: var(--color-ink-3);
}
.spacer {
  flex: 1;
}
.timing {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font: 400 var(--text-meta) / 16px var(--font-mono);
  color: var(--color-ink-3);
  font-variant-numeric: tabular-nums;
}
.bar {
  height: 2px;
  background: var(--color-line-soft);
  overflow: hidden;
}
.fill {
  display: block;
  height: 100%;
  background: var(--hue);
  transform-origin: left center;
}
.card[data-state='fired'] .fill {
  background: var(--color-ink-3);
}
.code {
  font: 400 var(--text-item) / 18px var(--font-mono);
  font-variant-ligatures: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: no-preference) {
  .fill {
    transition: transform var(--motion-base) var(--ease-out);
  }
}
</style>
