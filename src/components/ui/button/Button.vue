<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { cn } from 'cn'
import { Primitive } from 'reka-ui'
import { Kbd } from '@/components/ui/kbd'
import { buttonVariants } from '.'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  /** Printed `[key]` before the label. Decorative: the button's own name must still describe the action. */
  hotkey?: string
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})
</script>

<template>
  <Primitive
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <!-- Hidden below sm, like every other printed hotkey: touch screens have no keyboard. -->
    <Kbd
      v-if="hotkey"
      aria-hidden="true"
      :inverse="(variant ?? 'default') === 'default'"
      class="max-sm:hidden"
    >
      {{ hotkey }}
    </Kbd>
    <slot />
  </Primitive>
</template>
