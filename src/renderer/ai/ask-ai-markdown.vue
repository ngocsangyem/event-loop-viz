<script setup lang="ts">
import { computed } from 'vue'
import AskAiInline from './ask-ai-inline.vue'
import { parseMarkdown } from './markdown-lite'

/**
 * Renders model output as Markdown-lite in the answer voice (Inter 14/22, ink-2). Numbered lists
 * print `01 02 03` counters, as the tour stops do.
 */
const props = defineProps<{ text: string }>()
const blocks = computed(() => parseMarkdown(props.text))
</script>

<template>
  <div class="text-foreground-2 flex flex-col gap-2 font-sans text-sm leading-[22px] break-words">
    <template v-for="(block, i) in blocks" :key="i">
      <p v-if="block.kind === 'paragraph'"><AskAiInline :parts="block.inlines" /></p>
      <pre v-else-if="block.kind === 'code'" tabindex="0" class="bg-raised border-border-soft overflow-x-auto border p-2 font-mono text-xs"><code>{{ block.text }}</code></pre>
      <ol v-else-if="block.ordered" class="flex flex-col gap-1 [counter-reset:step]">
        <li
          v-for="(item, k) in block.items"
          :key="k"
          class="flex gap-3 [counter-increment:step] before:text-muted-foreground before:w-5 before:shrink-0 before:font-mono before:text-[11px] before:leading-[22px] before:content-[counter(step,decimal-leading-zero)]"
        >
          <span class="min-w-0"><AskAiInline :parts="item" /></span>
        </li>
      </ol>
      <ul v-else class="flex flex-col gap-1">
        <li v-for="(item, k) in block.items" :key="k" class="flex gap-3 before:text-muted-foreground before:w-5 before:shrink-0 before:font-mono before:text-[11px] before:leading-[22px] before:content-['—']">
          <span class="min-w-0"><AskAiInline :parts="item" /></span>
        </li>
      </ul>
    </template>
  </div>
</template>
