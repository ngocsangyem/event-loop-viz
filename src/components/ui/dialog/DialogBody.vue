<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'

/** Dialog body band: padding 20, gap 20. Optional; callers may lay out content themselves. */
const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="dialog-body" :class="cn('flex flex-col gap-5 p-5', props.class)">
    <slot />
  </div>
</template>
