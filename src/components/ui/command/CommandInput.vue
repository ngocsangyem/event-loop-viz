<script setup lang="ts">
import type { ListboxFilterProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { ListboxFilter, useForwardProps } from 'reka-ui'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { useCommand } from '.'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<ListboxFilterProps & {
  class?: HTMLAttributes['class']
}>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)

const { filterState } = useCommand()
</script>

<template>
  <div
    data-slot="command-input-wrapper"
    class="border-b border-border"
  >
    <InputGroup class="h-10 border-0">
      <ListboxFilter
        v-bind="{ ...forwardedProps, ...$attrs }"
        v-model="filterState.search"
        data-slot="command-input"
        auto-focus
        :class="cn('w-full bg-transparent pr-3 pl-2 font-mono text-[13px] outline-hidden disabled:cursor-not-allowed disabled:opacity-50', props.class)"
      />
      <InputGroupAddon>
        <span class="font-mono text-[13px] text-brand" aria-hidden="true">❯</span>
      </InputGroupAddon>
    </InputGroup>
  </div>
</template>
