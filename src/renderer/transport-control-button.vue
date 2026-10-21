<script setup lang="ts">
import type { Component } from 'vue'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * One playback control, drawn as a mono word with its hotkey printed before it (`[⇧←]TICK`).
 * The word is part of the full name, which the tooltip and the accessible name carry. Phones
 * show the icon and the word without the hotkey, since touch has no keys.
 */
defineProps<{
  id: string
  label: string
  word: string
  icon: Component
  shortcut: string
  /** The shortcut in printed form (`⇧←`). */
  keyHint: string
  disabled: boolean
}>()
const emit = defineEmits<{ press: [] }>()
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="gap-1 px-2 max-sm:h-11! max-sm:min-w-11"
        :aria-label="label"
        :data-control="id"
        :disabled="disabled"
        @click="emit('press')"
      >
        <Kbd aria-hidden="true" class="max-sm:hidden">{{ keyHint }}</Kbd>
        <component :is="icon" class="sm:hidden" />
        <span class="max-sm:sr-only">{{ word }}</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ label }} · {{ shortcut }}</TooltipContent>
  </Tooltip>
</template>
