<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="alert-action"
    :class="cn('text-foreground font-mono text-xs leading-5 font-medium underline underline-offset-[3px]', props.class)"
  >
    <slot />
  </div>
</template>
