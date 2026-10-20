<script setup lang="ts">
defineProps<{ examples: readonly { id: string; title: string; description: string }[] }>()
const emit = defineEmits<{ load: [id: string] }>()
</script>

<template>
  <details data-testid="example-library">
    <summary>Examples</summary>
    <ul>
      <li v-for="example in examples" :key="example.id">
        <button type="button" :data-testid="`example-${example.id}`" @click="emit('load', example.id)">
          {{ example.title }}
        </button>
        {{ example.description }}
      </li>
    </ul>
  </details>
</template>
