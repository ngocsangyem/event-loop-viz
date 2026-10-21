<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<SliderRootProps & {
  class?: HTMLAttributes['class']
  /** Accessible name and value text for the thumb (role=slider). */
  thumbLabel?: string
  thumbValueText?: string
}>()
const emits = defineEmits<SliderRootEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'thumbLabel', 'thumbValueText')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SliderRoot
    v-slot="{ modelValue }"
    data-slot="slider"
    :data-vertical="props.orientation === 'vertical' ? '' : undefined"
    :class="cn(
      // The playhead moves with --motion-line: its wrapper span (reka positions it with `left`) is the one that animates.
      'data-vertical:min-h-40 relative flex w-full touch-none items-start select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col [&>span:not([data-slot=slider-track])]:transition-[left] [&>span:not([data-slot=slider-track])]:duration-(--motion-line)',
      props.class,
    )"
    v-bind="forwarded"
  >
    <SliderTrack
      data-slot="slider-track"
      :data-horizontal="props.orientation !== 'vertical' ? '' : undefined"
      :data-vertical="props.orientation === 'vertical' ? '' : undefined"
      class="bg-raised data-horizontal:h-1 data-vertical:w-1 relative grow overflow-hidden shadow-[inset_0_0_0_1px_var(--border-soft)] data-horizontal:mt-2 data-horizontal:w-full data-vertical:h-full"
    >
      <SliderRange
        data-slot="slider-range"
        :data-horizontal="props.orientation !== 'vertical' ? '' : undefined"
        :data-vertical="props.orientation === 'vertical' ? '' : undefined"
        class="bg-foreground-2/55 absolute select-none data-horizontal:h-full data-vertical:w-full"
      />
    </SliderTrack>

    <SliderThumb
      v-for="(_, key) in modelValue"
      :key="key"
      :aria-label="thumbLabel"
      :aria-valuetext="thumbValueText"
      data-slot="slider-thumb"
      :data-vertical="props.orientation === 'vertical' ? '' : undefined"
      class="bg-brand relative -top-0.5 block h-6 w-0.5 shrink-0 shadow-[0_0_0_2px_var(--background)] select-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderRoot>
</template>
