<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<CheckboxRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<CheckboxRootEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <CheckboxRoot
    v-slot="slotProps"
    data-slot="checkbox"
    v-bind="forwarded"
    :class="cn('border-foreground-2 bg-background data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground aria-invalid:border-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring flex size-4 items-center justify-center border transition-colors group-has-disabled/field:opacity-50 peer relative shrink-0 after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50', props.class)"
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="grid place-content-center font-mono text-[11px] leading-none text-current transition-none"
    >
      <slot v-bind="slotProps">
        <span aria-hidden="true">✓</span>
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
