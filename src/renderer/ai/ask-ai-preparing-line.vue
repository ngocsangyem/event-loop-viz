<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/** Shown while the Script runs because a question came before any Run: the `✻` glyph pulses, still under reduced motion. */
const { t } = useI18n()
</script>

<template>
  <p class="text-muted-foreground border-border flex shrink-0 items-center gap-2 border-t px-4 py-2 font-mono text-xs" data-testid="ask-ai-preparing">
    <span class="text-brand animate-pulse motion-reduce:animate-none" aria-hidden="true">✻</span>
    {{ t('ai.preparing') }}
  </p>
</template>
