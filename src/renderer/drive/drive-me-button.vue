<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

/**
 * The `[D]DRIVE ME` word that starts and ends the walkthrough. It sits in the Script / Source
 * pane header (`compact`) and in the dock; without a Trace, starting it runs the Script first.
 */
defineProps<{ active: boolean; compact?: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
const { t } = useI18n()
</script>

<template>
  <Button
    :variant="active ? 'pressed' : compact ? 'ghost' : 'outline'"
    :size="compact ? 'sm' : 'lg'"
    hotkey="D"
    :class="['shrink-0', !compact && 'max-sm:h-11!']"
    :aria-label="active ? t('drive.stop') : t('drive.start')"
    :aria-pressed="active"
    data-testid="drive-me"
    @click="emit('toggle')"
  >
    <span aria-hidden="true">{{ t('drive.start') }}</span>
  </Button>
</template>
