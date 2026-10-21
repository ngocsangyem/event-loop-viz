<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import {
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import DialogCloseText from './DialogCloseText.vue'
import DialogOverlay from './DialogOverlay.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DialogContentProps & { class?: HTMLAttributes['class'], showCloseButton?: boolean }>(), {
  showCloseButton: true,
})
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="cn('bg-popover text-popover-foreground border-border data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 motion-reduce:animate-none fixed top-1/2 left-1/2 z-50 flex w-[500px] max-w-full -translate-x-1/2 -translate-y-1/2 flex-col border text-sm outline-none duration-100', props.class)"
    >
      <slot />

      <DialogCloseText v-if="showCloseButton" />
    </DialogContent>
  </DialogPortal>
</template>
