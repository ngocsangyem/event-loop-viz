<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <kbd
    data-slot="kbd"
    :class="cn('kbd-bracket text-muted-foreground h-5 w-fit gap-0 px-0 font-mono text-[11.5px] font-normal [&_svg:not([class*=size-])]:size-3 pointer-events-none inline-flex items-center justify-center select-none', props.class)"
  >
    <slot />
  </kbd>
</template>
