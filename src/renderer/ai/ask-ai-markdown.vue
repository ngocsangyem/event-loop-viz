<script setup lang="ts">
import { computed } from 'vue'
import { parseMarkdown } from './markdown-lite'

/**
 * Renders model output as Markdown-lite. Every piece goes through text interpolation, so
 * nothing the model returns can inject markup.
 */
const props = defineProps<{ text: string }>()
const blocks = computed(() => parseMarkdown(props.text))
</script>

<template>
  <div class="flex flex-col gap-2 break-words">
    <template v-for="(block, i) in blocks" :key="i">
      <p v-if="block.kind === 'paragraph'">
        <template v-for="(part, j) in block.inlines" :key="j">
          <code v-if="part.kind === 'code'" class="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]">{{ part.text }}</code>
          <strong v-else-if="part.kind === 'strong'">{{ part.text }}</strong>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
      <pre v-else-if="block.kind === 'code'" tabindex="0" class="bg-raised border-border-soft overflow-x-auto border p-2 font-mono text-xs"><code>{{ block.text }}</code></pre>
      <component :is="block.ordered ? 'ol' : 'ul'" v-else :class="['ml-5 flex flex-col gap-1', block.ordered ? 'list-decimal' : 'list-disc']">
        <li v-for="(item, k) in block.items" :key="k">
          <template v-for="(part, j) in item" :key="j">
            <code v-if="part.kind === 'code'" class="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]">{{ part.text }}</code>
            <strong v-else-if="part.kind === 'strong'">{{ part.text }}</strong>
            <template v-else>{{ part.text }}</template>
          </template>
        </li>
      </component>
    </template>
  </div>
</template>
