<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="dialog-header"
    :class="cn('flex h-11 shrink-0 items-center gap-3 border-b border-border px-5 pr-24', props.class)"
  >
    <slot />
  </div>
</template>
