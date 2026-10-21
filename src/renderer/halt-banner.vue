<script setup lang="ts">
import { computed } from 'vue'
import { OctagonXIcon } from '@lucide/vue'
import { haltMessage } from './run-settings-model'
import type { HaltReason } from '../trace/trace-event'
import { Alert, AlertDescription } from '@/components/ui/alert'

const props = defineProps<{ halt: { reason: HaltReason; limit?: number } | null }>()
const message = computed(() => (props.halt ? haltMessage(props.halt.reason, props.halt.limit) : null))
</script>

<template>
  <Alert v-if="message" role="status" variant="destructive" data-testid="halt-banner">
    <OctagonXIcon />
    <AlertDescription>{{ message }}</AlertDescription>
  </Alert>
</template>
