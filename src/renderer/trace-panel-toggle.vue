<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

/**
 * The `[V]TRACE` word in the dock. The Why rail (why this step happened, then the Trace Events
 * list) is optional: it stays hidden until the viewer asks for it, so the stage gets the width.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
const { t } = useI18n()
</script>

<template>
  <Button
    :variant="open ? 'pressed' : 'outline'"
    size="lg"
    hotkey="V"
    class="shrink-0 max-sm:h-11!"
    :aria-label="open ? t('tracePanel.close') : t('tracePanel.open')"
    :aria-pressed="open"
    data-testid="trace-panel-toggle"
    @click="emit('toggle')"
  >
    <span aria-hidden="true">{{ t('tracePanel.open') }}</span>
  </Button>
</template>
