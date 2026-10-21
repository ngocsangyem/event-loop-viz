<script setup lang="ts">
import type { Component } from 'vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** One icon-only playback control; the tooltip names it and its keyboard shortcut. */
defineProps<{ id: string; label: string; icon: Component; shortcut: string; disabled: boolean }>()
const emit = defineEmits<{ press: [] }>()
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        variant="ghost"
        size="icon-sm"
        class="max-sm:size-11!"
        :aria-label="label"
        :data-control="id"
        :disabled="disabled"
        @click="emit('press')"
      >
        <component :is="icon" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ label }} · {{ shortcut }}</TooltipContent>
  </Tooltip>
</template>
