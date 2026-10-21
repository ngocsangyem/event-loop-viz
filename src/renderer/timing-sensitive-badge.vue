<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

defineProps<{ timingSensitive: boolean }>()
const { t } = useI18n()
</script>

<template>
  <!-- A note, not a warning: the Trace is valid, only its ordering is unproven against real timing. -->
  <Alert
    v-if="timingSensitive"
    tone="note"
    role="status"
    data-testid="timing-badge"
    :title="t('timing.hint')"
    class="flex min-h-(--banner-h) flex-wrap items-center gap-x-4 gap-y-1"
  >
    <AlertTitle class="shrink-0">{{ t('banner.timing') }}</AlertTitle>
    <AlertDescription class="min-w-0 flex-1">{{ t('timing.badge') }}</AlertDescription>
  </Alert>
</template>
