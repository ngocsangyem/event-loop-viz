<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * One playback control, drawn as a mono word with its hotkey printed before it (`[⇧←]TICK`).
 * The word is part of the full name, which the tooltip and the accessible name carry. A phone
 * has no keys, so it shows the direction glyph instead, in a 52px touch target.
 */
defineProps<{
  id: string
  label: string
  word: string
  /** Direction arrow shown on touch screens, where the hotkey is not printed. */
  glyph: string
  /** The glyph follows the word (forward controls) instead of leading it. */
  glyphAfter?: boolean
  shortcut: string
  /** The shortcut in printed form (`⇧←`). */
  keyHint: string
  disabled: boolean
  /** Not one of the five phone targets (Start, End and Task jumps hide there). */
  extra?: boolean
}>()
const emit = defineEmits<{ press: [] }>()
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        variant="secondary"
        size="lg"
        :hotkey="keyHint"
        :class="['max-sm:h-[52px] max-sm:min-w-0 max-sm:flex-1', extra && 'max-sm:hidden']"
        :aria-label="label"
        :data-control="id"
        :disabled="disabled"
        @click="emit('press')"
      >
        <span v-if="!glyphAfter" class="sm:hidden" aria-hidden="true">{{ glyph }}</span>
        {{ word }}
        <span v-if="glyphAfter" class="sm:hidden" aria-hidden="true">{{ glyph }}</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ label }} · {{ shortcut }}</TooltipContent>
  </Tooltip>
</template>
