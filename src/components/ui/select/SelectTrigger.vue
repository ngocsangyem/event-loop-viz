<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { SelectIcon, SelectTrigger, useForwardProps } from 'reka-ui'

const props = withDefaults(
  defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'], size?: 'sm' | 'default' }>(),
  { size: 'default' },
)

const delegatedProps = reactiveOmit(props, 'class', 'size')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-size="size"
    v-bind="forwardedProps"
    :class="cn(
      'border-border bg-background text-foreground data-placeholder:text-muted-foreground hover:bg-accent data-[state=open]:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-error gap-2 border px-3 font-mono text-[13px] font-normal select-none data-[size=default]:h-10 data-[size=sm]:h-(--control-sm) flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center',
      props.class,
    )"
  >
    <slot />
    <SelectIcon as-child>
      <span class="text-muted-foreground pointer-events-none" aria-hidden="true">▾</span>
    </SelectIcon>
  </SelectTrigger>
</template>
