<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'

const props = defineProps<{
  class?: HTMLAttributes['class']
  /** On a filled surface (primary button): inherit the surface's text colour, dimmed. */
  inverse?: boolean
}>()
</script>

<template>
  <kbd
    data-slot="kbd"
    :class="cn(
      'kbd-bracket w-fit gap-0 px-0 font-mono text-xs leading-none font-medium tracking-[0.02em] [&_svg:not([class*=size-])]:size-3 pointer-events-none inline-flex items-center justify-center select-none',
      inverse ? 'text-inherit opacity-75' : 'text-muted-foreground',
      props.class,
    )"
  >
    <slot />
  </kbd>
</template>
