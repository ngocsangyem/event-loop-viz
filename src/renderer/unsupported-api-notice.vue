<script setup lang="ts">
defineProps<{ apis: readonly string[] }>()

/** What the simulator models; everything else in the Unsupported list throws. */
const SUPPORTED = [
  'Promise, async/await, generators, async generators, for await',
  'setTimeout, setInterval, clearTimeout, clearInterval',
  'queueMicrotask',
  'MessageChannel',
  'console.log / info / warn / error',
  'Date.now() and performance.now() (Virtual Clock)',
  'Math.random (seeded per Run)',
]
</script>

<template>
  <section class="api-notice">
    <p v-if="apis.length" role="status" data-testid="unsupported-api-notice">
      Unsupported APIs referenced: <code v-for="api in apis" :key="api">{{ api }}</code>
      — touching one throws UnsupportedApiError.
    </p>
    <details data-testid="supported-apis">
      <summary>Supported APIs</summary>
      <ul>
        <li v-for="item in SUPPORTED" :key="item">{{ item }}</li>
      </ul>
    </details>
  </section>
</template>

<style scoped>
code {
  margin: 0 0.25em;
}
</style>
