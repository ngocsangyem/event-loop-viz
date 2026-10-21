<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { AlertTone } from '.'
import { cn } from 'cn'
import { computed, inject, ref } from 'vue'
import { alertToneKey, alertTones } from '.'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const tone = inject(alertToneKey, ref<AlertTone>('note'))
const spec = computed(() => alertTones[tone.value])
</script>

<template>
  <div
    data-slot="alert-title"
    :class="cn('font-mono text-[11.5px] leading-[14px] font-medium uppercase tracking-[0.02em] [&_a]:underline [&_a]:underline-offset-3', spec.title, props.class)"
  >
    <!-- The glyph and the label read as one mono phrase (`⚠ LABEL`), so the gap is a typed space width. -->
    <span aria-hidden="true" class="mr-[1ch]">{{ spec.glyph }}</span>
    <slot />
  </div>
</template>
