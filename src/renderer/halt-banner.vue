<script setup lang="ts">
import { computed } from 'vue'
import { haltMessage } from './run-settings-model'
import type { HaltReason } from '../trace/trace-event'

const props = defineProps<{ halt: { reason: HaltReason; limit?: number } | null }>()
const message = computed(() => (props.halt ? haltMessage(props.halt.reason, props.halt.limit) : null))
</script>

<template>
  <p v-if="message" role="status" data-testid="halt-banner">{{ message }}</p>
</template>
