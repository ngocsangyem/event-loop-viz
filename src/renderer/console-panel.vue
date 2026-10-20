<script setup lang="ts">
import { computed } from 'vue'
import { formatConsoleLines } from './console-lines'
import type { ObservableOutput } from '../trace/observable-output'

const props = defineProps<{ output: ObservableOutput }>()
const lines = computed(() => formatConsoleLines(props.output))
</script>

<template>
  <ul data-testid="console-panel">
    <li v-for="(line, i) in lines" :key="i" :class="{ 'console-error': line.kind === 'error' }">
      {{ line.text }}
    </li>
  </ul>
</template>

<style scoped>
.console-error {
  color: var(--anatomy-error-text);
}
</style>
