<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { TimerIcon } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'

defineProps<{ timingSensitive: boolean }>()
const { t } = useI18n()
</script>

<template>
  <Alert
    v-if="timingSensitive"
    role="status"
    data-testid="timing-badge"
    :title="t('timing.hint')"
  >
    <TimerIcon />
    <AlertDescription>
      {{ t('timing.badge') }}
    </AlertDescription>
  </Alert>
</template>
