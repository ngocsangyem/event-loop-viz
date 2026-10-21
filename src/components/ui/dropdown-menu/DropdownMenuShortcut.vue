<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <span
    data-slot="dropdown-menu-shortcut"
    :class="cn('text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto font-mono text-[11.5px] tracking-[0.02em]', props.class)"
  >
    <slot />
  </span>
</template>
