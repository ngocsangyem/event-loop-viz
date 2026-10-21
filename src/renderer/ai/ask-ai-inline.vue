<script setup lang="ts">
import { highlightConcepts } from './concept-highlight'
import type { Inline } from './markdown-lite'

/**
 * One line of inline Markdown-lite. Code is bare mono (no box); concept ids in plain text take
 * their hue. Everything goes through interpolation, so model output cannot inject markup.
 */
defineProps<{ parts: readonly Inline[] }>()
</script>

<template>
  <template v-for="(part, j) in parts" :key="j">
    <code v-if="part.kind === 'code'" class="font-mono text-[13px]">{{ part.text }}</code>
    <strong v-else-if="part.kind === 'strong'" class="text-foreground font-semibold">{{ part.text }}</strong>
    <template v-else>
      <template v-for="(seg, k) in highlightConcepts(part.text)" :key="k">
        <span v-if="seg.hue" :class="['font-mono text-[13px]', seg.hue]">{{ seg.text }}</span>
        <template v-else>{{ seg.text }}</template>
      </template>
    </template>
  </template>
</template>
