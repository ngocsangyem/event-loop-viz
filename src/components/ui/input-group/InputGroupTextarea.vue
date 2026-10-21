<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Textarea
    data-slot="input-group-control"
    :class="cn(
      'border-0 bg-transparent py-2 focus-visible:outline-0 disabled:bg-transparent flex-1 resize-none',
      props.class,
    )"
  />
</template>
