<script setup lang="ts">
defineProps<{ timingSensitive: boolean }>()
</script>

<template>
  <p
    v-if="timingSensitive"
    role="status"
    data-testid="timing-badge"
    title="A timer was due within 2 ms of a compute stretch ending, so Chrome's real timing could order this Run differently."
  >
    Timing-sensitive: ordering depends on compute time and may differ in your browser.
  </p>
</template>
