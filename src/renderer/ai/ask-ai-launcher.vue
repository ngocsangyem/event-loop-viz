<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

/**
 * The `[A]ASK AI` word at the end of the dock that opens and closes the Ask AI panel. It is tiny
 * and loads with the page; the panel loads on demand. It stays enabled without a Trace: asking
 * runs the Script first.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
const { t } = useI18n()
</script>

<template>
  <!-- An outline word in the dock; open, it takes the pressed look: ink border and the row fill. -->
  <Button
    :variant="open ? 'pressed' : 'outline'"
    size="lg"
    hotkey="A"
    class="shrink-0 max-sm:h-11!"
    :aria-label="open ? t('ai.launcher.close') : t('ai.launcher.open')"
    :aria-expanded="open"
    aria-controls="ask-ai-panel"
    data-testid="ask-ai"
    @click="emit('toggle')"
  >
    <span aria-hidden="true">{{ t('ai.launcher.open') }}</span>
  </Button>
</template>
