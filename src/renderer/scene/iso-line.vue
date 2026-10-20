<script setup lang="ts">
import type { LineTone } from './iso-kit'

withDefaults(defineProps<{ d: string; tone?: LineTone; free?: boolean }>(), {
  tone: 'lo',
  free: false,
})
</script>

<template>
  <path v-if="d" class="iso-line" :data-tone="tone" :data-free="free ? '' : undefined" :d="d" />
</template>
