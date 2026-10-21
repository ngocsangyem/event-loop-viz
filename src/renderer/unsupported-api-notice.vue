<script setup lang="ts">
import { TriangleAlertIcon } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

defineProps<{ apis: readonly string[] }>()
</script>

<template>
  <Alert v-if="apis.length" role="status" data-testid="unsupported-api-notice">
    <TriangleAlertIcon />
    <AlertTitle>Unsupported APIs referenced</AlertTitle>
    <AlertDescription>
      <p>
        <code v-for="api in apis" :key="api" class="bg-muted mr-1 rounded px-1 font-mono">{{ api }}</code>
        — touching one throws UnsupportedApiError.
      </p>
    </AlertDescription>
  </Alert>
</template>
