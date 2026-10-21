<script setup lang="ts">
/**
 * A queue or stack lane (DESIGN.md · Queue item / stack frame): rows on a raised fill with a
 * 1px soft line and a 2px left rule in the concept hue. Each row shows a mono id in the hue,
 * the kind, an optional `L<line>` and a tag, then the callback code. Row states: `new` (soft fill
 * + full-hue border + NEW tag), `top`/`running` (hue border at the -border alpha), `ghost`
 * (dashed, no rule, ink-3: an item that has left the lane).
 *
 * Motion (DESIGN.md · Motion): rows reveal with opacity + a 4px rise, leave with a fade and a
 * 4px lift, and neighbours glide (FLIP). Reduced motion keeps only the end state.
 *
 * `items` takes an array set as a DOM property (`el.items = [...]`), or the same array as a JSON
 * string attribute (`items='[{"id":"j1","label":"Job #1"}]'`) for plain-HTML use.
 */
import { computed } from 'vue'
import { hueVars } from '../concepts'
import type { Concept } from '../concepts'

export interface QueueRowItem {
  /** Stable key; also the row's identity for the move animation. */
  id: string
  /** Mono id shown in the hue, e.g. `JOB #3`, `TASK #2`, `FRAME`. */
  label: string
  /** What kind of entry this is, e.g. `Promise reaction`, `timer`. */
  kind?: string
  /** The callback's source text, e.g. `() => console.log('then 1')`. */
  code?: string
  /** Source line of the callback. */
  line?: number
  state?: 'default' | 'new' | 'top' | 'running' | 'ghost'
}

const props = withDefaults(
  defineProps<{
    items?: QueueRowItem[] | string
    concept?: Concept
    /** Text shown when the lane is empty. */
    empty?: string
  }>(),
  { items: () => [], concept: undefined, empty: 'Empty' },
)

const style = computed(() => hueVars(props.concept))

/** Rows from the property (array) or the attribute (JSON string); bad JSON shows the empty state. */
const rows = computed<QueueRowItem[]>(() => {
  if (Array.isArray(props.items)) return props.items
  try {
    const parsed: unknown = JSON.parse(props.items || '[]')
    return Array.isArray(parsed) ? (parsed as QueueRowItem[]) : []
  } catch {
    return []
  }
})
const TAGS: Record<string, string> = { new: 'NEW', top: 'TOP', running: 'RUNNING' }
</script>

<template>
  <div class="lane" :style="style">
    <p v-if="rows.length === 0" class="empty">{{ empty }}</p>
    <TransitionGroup tag="ol" name="row" class="rows">
      <li v-for="item in rows" :key="item.id" class="row" :data-state="item.state ?? 'default'">
        <div class="meta">
          <span class="id">{{ item.label }}</span>
          <span v-if="item.kind" class="kind">{{ item.kind }}</span>
          <span class="spacer" />
          <span v-if="item.line !== undefined" class="line">L{{ item.line }}</span>
          <span v-if="TAGS[item.state ?? '']" class="tag">{{ TAGS[item.state ?? ''] }}</span>
        </div>
        <code v-if="item.code" class="code">{{ item.code }}</code>
      </li>
    </TransitionGroup>
  </div>
</template>

<style>
:host {
  display: block;
  min-width: 0;
}
.lane {
  position: relative;
  font-family: var(--font-sans);
  color: var(--color-ink);
}
.empty {
  margin: 0;
  padding: 8px 0;
  text-align: center;
  font: 400 var(--text-meta) / 16px var(--font-mono);
  color: var(--color-ink-3);
}
.rows {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: grid;
  gap: 2px;
  padding: 6px 10px;
  background: var(--color-bg-raised);
  border: 1px solid var(--color-line-soft);
  box-shadow: inset 2px 0 0 var(--hue);
  transition:
    background-color var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out);
}
.row[data-state='new'] {
  background: var(--hue-soft);
  border-color: var(--hue);
}
.row[data-state='top'],
.row[data-state='running'] {
  background: var(--hue-soft);
  border-color: var(--hue-border);
}
.row[data-state='ghost'] {
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
}
.id,
.tag {
  color: var(--hue);
}
.row[data-state='ghost'] .id {
  color: var(--color-ink-3);
}
.kind {
  font-size: 13px;
  color: var(--color-ink-2);
}
.line {
  font-weight: 400;
  color: var(--color-ink-3);
}
.spacer {
  flex: 1;
}
.code {
  font: 400 var(--text-item) / 18px var(--font-mono);
  font-variant-ligatures: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: no-preference) {
  .row-enter-active,
  .row-leave-active {
    transition:
      transform var(--motion-base) var(--ease-out),
      opacity var(--motion-base) var(--ease-out);
  }
  .row-move {
    transition: transform var(--motion-slow) var(--ease-swift);
  }
  .row-enter-from {
    opacity: 0;
    transform: translateY(4px);
  }
  .row-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }
  .row-leave-active {
    position: absolute;
    inset-inline: 0;
  }
}
</style>
