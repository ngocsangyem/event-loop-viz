<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { TriangleAlertIcon } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

defineProps<{ apis: readonly string[] }>()
const { t } = useI18n()
</script>

<template>
  <Alert v-if="apis.length" role="status" variant="destructive" data-testid="unsupported-api-notice">
    <TriangleAlertIcon />
    <AlertTitle>{{ t('unsupported.title') }}</AlertTitle>
    <AlertDescription>
      <p>
        <code v-for="api in apis" :key="api" class="bg-error-soft text-destructive mr-1 px-1 font-mono">{{ api }}</code>
        {{ t('unsupported.touching') }}
      </p>
    </AlertDescription>
  </Alert>
</template>
