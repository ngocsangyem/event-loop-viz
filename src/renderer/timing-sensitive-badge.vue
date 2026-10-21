<script setup lang="ts">
import { TimerIcon } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'

defineProps<{ timingSensitive: boolean }>()
</script>

<template>
  <Alert
    v-if="timingSensitive"
    role="status"
    data-testid="timing-badge"
    title="A timer was due within 2 ms of a compute stretch ending, so Chrome's real timing could order this Run differently."
  >
    <TimerIcon />
    <AlertDescription>
      Timing-sensitive: ordering depends on compute time and may differ in your browser.
    </AlertDescription>
  </Alert>
</template>
