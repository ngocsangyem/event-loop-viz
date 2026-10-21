<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { SwitchRoot, useForwardPropsEmits } from 'reka-ui'

// The ON/OFF words are props (not i18n) so this primitive stays free of app state; callers translate them.
const props = withDefaults(defineProps<SwitchRootProps & {
  class?: HTMLAttributes['class']
  label?: string
  onLabel?: string
  offLabel?: string
}>(), {
  onLabel: 'ON',
  offLabel: 'OFF',
})

const emits = defineEmits<SwitchRootEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'label', 'onLabel', 'offLabel')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SwitchRoot
    v-slot="slotProps"
    data-slot="switch"
    v-bind="forwarded"
    :class="cn(
      'inline-flex h-(--control-md) shrink-0 items-center gap-1.5 px-2 font-mono text-xs leading-none font-medium uppercase tracking-[0.02em] text-foreground transition-colors duration-(--motion-fast) ease-(--ease-out) outline-none select-none hover:bg-accent data-disabled:cursor-not-allowed data-disabled:opacity-35 data-disabled:hover:bg-transparent',
      props.class,
    )"
  >
    <slot>{{ label }}</slot>
    <span :class="slotProps.modelValue ? 'text-console' : 'text-muted-foreground'">
      {{ slotProps.modelValue ? onLabel : offLabel }}
    </span>
  </SwitchRoot>
</template>
