<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { AlertTone, AlertVariant } from '.'
import { cn } from 'cn'
import { computed, provide } from 'vue'
import { alertToneKey, alertTones, alertVariants } from '.'

const props = defineProps<{
  class?: HTMLAttributes['class']
  tone?: AlertTone
  variant?: AlertVariant
}>()

const tone = computed<AlertTone>(() => props.tone ?? (props.variant === 'destructive' ? 'error' : 'note'))
provide(alertToneKey, tone)
</script>

<template>
  <!-- Only urgent tones interrupt a screen reader; a caller's own `role` attribute still wins. -->
  <div
    data-slot="alert"
    :data-tone="tone"
    :role="alertTones[tone].urgent ? 'alert' : undefined"
    :class="cn(alertVariants({ tone }), props.class)"
  >
    <slot />
  </div>
</template>
