<script setup lang="ts">
/**
 * Read-only Source pane body (DESIGN.md · Edit ↔ Replay, Signature moves, States). No header: it
 * composes inside `<elv-pane title="Source · Read-only">`. A line-number gutter (mono ink-3) sits
 * beside code in mono 13/22 with ligatures off.
 *
 * - Current line: hover-row fill + 2px accent left rule (`current`).
 * - Gutter squares: 8px squares in concept hues on lines whose work is still queued (`queued`).
 * - Concept-aware highlighting: setTimeout in webapi, Promise/then/queueMicrotask in job,
 *   console.* in console, plus keyword/string/number/ident/punct (see source-tokenizer.ts).
 * - Diagnostics: red wavy underline + error-soft fill on columns from..to, gutter `↯` for syntax,
 *   and an inline lint row under the line in mono red.
 *
 * Source text comes from the `code` attribute/property only (lines split on newline). `queued` and
 * `diagnostics` take arrays as DOM properties, or JSON string attributes in plain HTML.
 */
import { computed } from 'vue'
import { hueVars } from '../concepts'
import type { Concept } from '../concepts'
import { parseListProp } from '../parse-list-prop'
import { segmentLine } from './source-tokenizer'

export interface QueuedMark {
  /** 1-based source line (absolute, i.e. counting from `start-line`). */
  line: number
  /** Which lane the pending work will land in: webapi while a timer waits, task once it fired, job for reactions. */
  concept: Concept
}

export interface SourceDiagnostic {
  /** 1-based source line. */
  line: number
  /** First flagged column, 0-based. */
  from: number
  /** One past the last flagged column. */
  to: number
  kind: 'unsupported' | 'syntax'
  /** Lint text, e.g. `fetch` (unsupported) or `SyntaxError: Unexpected token ')'`. */
  message: string
}

const props = withDefaults(
  defineProps<{
    code?: string
    /** 1-based line of the current step; omit in edit-free previews. */
    current?: number
    queued?: QueuedMark[] | string
    diagnostics?: SourceDiagnostic[] | string
    startLine?: number
  }>(),
  { code: '', current: undefined, queued: () => [], diagnostics: () => [], startLine: 1 },
)

const marks = computed(() => parseListProp<QueuedMark>(props.queued))
const diags = computed(() => parseListProp<SourceDiagnostic>(props.diagnostics))

const rows = computed(() =>
  props.code.split('\n').map((text, i) => {
    const no = props.startLine + i
    const own = diags.value.filter((d) => d.line === no)
    return {
      no,
      segments: segmentLine(text, own),
      mark: marks.value.find((m) => m.line === no),
      syntax: own.some((d) => d.kind === 'syntax'),
      lint: own.map((d) => ({
        kind: d.kind,
        text: d.kind === 'syntax' ? `↯ ${d.message}` : `⚠ UNSUPPORTED API · ${d.message}`,
      })),
    }
  }),
)
</script>

<template>
  <div class="source" role="region" aria-label="Script source, read-only">
    <template v-for="row in rows" :key="row.no">
      <div class="row" :data-current="row.no === current ? '' : undefined">
        <span class="gutter" aria-hidden="true">
          <span v-if="row.syntax" class="syntax-mark">↯</span>
          <span v-else-if="row.mark" class="square" :style="hueVars(row.mark.concept)" />
          <span class="no">{{ row.no }}</span>
        </span>
        <code class="code"><span
          v-for="(s, i) in row.segments"
          :key="i"
          :class="['t-' + s.kind, { bad: s.flagged }]"
        >{{ s.text }}</span></code>
      </div>
      <div v-for="(l, i) in row.lint" :key="row.no + '-' + i" class="lint">{{ l.text }}</div>
    </template>
  </div>
</template>

<style>
:host {
  display: block;
  min-width: 0;
}
.source {
  font: 400 var(--text-code) / 22px var(--font-mono);
  font-variant-ligatures: none;
  color: var(--syn-ident);
  overflow-x: auto;
}
.row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  min-width: max-content;
  width: 100%;
}
.row[data-current] {
  background: var(--syn-line-active);
  box-shadow: inset 2px 0 0 var(--syn-line-rule);
  transition:
    background-color var(--motion-line) var(--ease-term),
    box-shadow var(--motion-line) var(--ease-term);
}
.gutter {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 0 10px 0 8px;
  color: var(--syn-gutter);
  font-size: var(--text-meta);
  font-variant-numeric: tabular-nums;
}
.square {
  width: 8px;
  height: 8px;
  background: var(--hue);
}
.syntax-mark {
  color: var(--error);
  font-size: 13px;
}
.code {
  font: inherit;
  white-space: pre;
}
.t-keyword {
  color: var(--syn-keyword);
}
.t-string {
  color: var(--syn-string);
}
.t-number {
  color: var(--syn-number);
}
.t-ident,
.t-plain {
  color: var(--syn-ident);
}
.t-punct {
  color: var(--syn-punct);
}
.t-webapi {
  color: var(--webapi);
}
.t-job {
  color: var(--job);
}
.t-console {
  color: var(--console);
}
.bad {
  background: var(--error-soft);
  text-decoration: underline wavy var(--error);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.lint {
  padding: 0 8px 0 44px;
  min-width: max-content;
  font-size: var(--text-meta);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--error);
  background: var(--error-soft);
}
</style>
