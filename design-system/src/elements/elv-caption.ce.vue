<script setup lang="ts">
/**
 * The step caption (DESIGN.md · Focal hierarchy #1): a mono meta row
 * `STEP 15 / 31 · TICK 1 · LINE 3 · VIRTUAL CLOCK 0 ms`, one Inter 500 20/28 sentence naming what
 * changed (default slot, or the `sentence` attribute), then the phase strip
 * `TASK #1 ✓ → MICROTASK CHECKPOINT · JOB 1/3 → NEXT: TASK #2`. The current phase is tinted in its
 * concept hue (soft fill + hue text). `halted` swaps the current phase for `HALT · BUDGET` in the
 * accent. The sentence is `aria-live=polite` so each step is announced once.
 *
 * `phases` takes an array as a DOM property, or the same array as a JSON string attribute.
 */
import { computed } from 'vue'
import { hueVars } from '../concepts'
import type { Concept } from '../concepts'
import { parseListProp } from '../parse-list-prop'

export interface CaptionPhase {
  /** Mono label, e.g. `TASK #1`, `MICROTASK CHECKPOINT · JOB 1/3`. */
  label: string
  /** Hue of the current phase chip. */
  concept?: Concept
  /** done prints a trailing ✓; next prints a leading `NEXT:`. */
  state: 'done' | 'current' | 'next'
}

const props = withDefaults(
  defineProps<{
    step?: number
    total?: number
    tick?: number
    line?: number
    /** Virtual Clock reading, e.g. `0 ms`. */
    clock?: string
    sentence?: string
    phases?: CaptionPhase[] | string
    /** The Run stopped on its Budget: the current phase reads HALT · BUDGET in the accent. */
    halted?: boolean
  }>(),
  {
    step: undefined, total: undefined, tick: undefined, line: undefined, clock: undefined,
    sentence: undefined, phases: () => [], halted: false,
  },
)

const meta = computed(() => {
  const parts: string[] = []
  if (props.step !== undefined) parts.push(`STEP ${props.step}${props.total !== undefined ? ` / ${props.total}` : ''}`)
  if (props.tick !== undefined) parts.push(`TICK ${props.tick}`)
  if (props.line !== undefined) parts.push(`LINE ${props.line}`)
  if (props.clock) parts.push(`VIRTUAL CLOCK ${props.clock}`)
  return parts
})

/** Strip chips; when halted the current chip (or a trailing one) becomes HALT · BUDGET. */
const chips = computed(() => {
  const list = parseListProp<CaptionPhase>(props.phases).map((p) => ({ ...p, halt: false }))
  if (!props.halted) return list
  const cur = list.findIndex((p) => p.state === 'current')
  if (cur >= 0) list[cur] = { label: 'HALT · BUDGET', state: 'current', halt: true }
  else list.push({ label: 'HALT · BUDGET', state: 'current', halt: true })
  return list
})
const text = (p: { label: string; state: string }) => (p.state === 'next' ? `NEXT: ${p.label}` : p.label)
</script>

<template>
  <div class="caption">
    <p class="meta">
      <template v-for="(m, i) in meta" :key="m"><span v-if="i" aria-hidden="true"> · </span>{{ m }}</template>
    </p>
    <p class="sentence" aria-live="polite"><slot>{{ sentence }}</slot></p>
    <ol v-if="chips.length" class="strip" aria-label="Phases">
      <li
        v-for="(p, i) in chips"
        :key="i"
        class="chip"
        :data-state="p.state"
        :data-halt="p.halt ? '' : undefined"
        :style="hueVars(p.halt ? 'loop' : p.concept)"
        :aria-current="p.state === 'current' ? 'step' : undefined"
      >
        <span v-if="i" class="arrow" aria-hidden="true">→</span>
        <span class="label">{{ text(p) }}<span v-if="p.state === 'done'" aria-hidden="true"> ✓</span></span>
      </li>
    </ol>
  </div>
</template>

<style>
:host {
  display: block;
  min-width: 0;
}
.caption {
  display: grid;
  gap: 6px;
  color: var(--color-ink);
}
.meta,
.strip {
  margin: 0;
  font: 400 var(--text-meta) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-ink-3);
}
.sentence {
  margin: 0;
  font: 500 var(--text-caption) / 28px var(--font-sans);
  text-wrap: pretty;
}
.strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  padding: 0;
  list-style: none;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.chip[data-state='done'] .label {
  color: var(--color-ink-2);
}
.chip[data-state='current'] .label {
  padding: 0 6px;
  background: var(--hue-soft);
  color: var(--hue);
  font-weight: 500;
}
.chip[data-halt] .label {
  color: var(--brand-text);
}
.arrow {
  color: var(--color-ink-4);
}
</style>
