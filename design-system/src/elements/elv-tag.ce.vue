<script setup lang="ts">
import { computed } from 'vue'
import { hueVars, type Concept } from '../concepts'

/**
 * A tag or count (DESIGN.md · Components → Badge, text-only variant): mono 500 uppercase label with
 * no box by default, e.g. `NEW`, `TOP`, `CHANGED`. `concept` tints it with a concept hue. `tone="filled"`
 * adds a soft hue fill and a 1px hue border for status chips such as `TIMING-SENSITIVE`,
 * `HALTED · BUDGET` or `CHROME 155 MODEL`. Static: a tag is never interactive.
 */
const props = withDefaults(
  defineProps<{
    /** Concept hue: stack, job, task, webapi, console, error or loop (accent). Omit for neutral. */
    concept?: Concept
    /** `text` = bare label (default); `filled` = soft fill + 1px hue border. */
    tone?: 'text' | 'filled'
  }>(),
  { concept: undefined, tone: 'text' },
)

const style = computed(() => hueVars(props.concept))
</script>

<template>
  <span class="tag" :data-tone="tone" :style="style"><slot /></span>
</template>

<style>
:host {
  display: inline-flex;
  vertical-align: middle;
}
:host([hidden]) {
  display: none;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 0;
  color: var(--hue);
  font: 500 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
}
.tag[data-tone='filled'] {
  padding: 0 6px;
  background: var(--hue-soft);
  border-color: var(--hue-border);
}
</style>
