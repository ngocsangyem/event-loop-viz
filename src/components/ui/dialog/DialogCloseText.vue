<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { DialogClose } from 'reka-ui'

/**
 * Text close control `[ESC]CLOSE` shared by Dialog and Sheet. Pinned to the header band
 * (44px tall) so it lines up with DialogHeader without that component knowing about it.
 */
const props = withDefaults(defineProps<{
  class?: HTMLAttributes['class']
  label?: string
  dataSlot?: string
}>(), {
  label: 'Close',
  dataSlot: 'dialog-close',
})
</script>

<template>
  <DialogClose
    :data-slot="dataSlot"
    :aria-label="label"
    :class="cn('absolute top-0 right-5 z-10 inline-flex h-11 items-center gap-0.5 bg-transparent font-mono text-[11.5px] leading-none font-medium tracking-[0.02em] uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', props.class)"
  >
    <span class="text-muted-foreground" aria-hidden="true">[ESC]</span>
    <span class="text-foreground" aria-hidden="true">{{ label }}</span>
  </DialogClose>
</template>
