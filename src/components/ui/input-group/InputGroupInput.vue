<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Input
    data-slot="input-group-control"
    :class="cn(
      'h-full border-0 bg-transparent focus-visible:outline-0 disabled:bg-transparent flex-1',
      props.class,
    )"
  />
</template>
