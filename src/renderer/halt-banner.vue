<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { OctagonXIcon } from '@lucide/vue'
import { haltMessage } from './run-settings-model'
import type { HaltReason } from '../trace/trace-event'
import { Alert, AlertDescription } from '@/components/ui/alert'

const props = defineProps<{ halt: { reason: HaltReason; limit?: number } | null }>()
const { t, locale } = useI18n()
const message = computed(() =>
  props.halt ? haltMessage(props.halt.reason, props.halt.limit, t, locale.value) : null,
)
</script>

<template>
  <Alert v-if="message" role="status" variant="destructive" data-testid="halt-banner">
    <OctagonXIcon />
    <AlertDescription>{{ message }}</AlertDescription>
  </Alert>
</template>
