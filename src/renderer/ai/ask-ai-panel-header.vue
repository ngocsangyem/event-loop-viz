<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

/**
 * Header band: `ASK AI` + `INTERVIEW COACH`, then text actions. MINIMIZE only shows while a tour
 * runs, because only then does minimizing differ from closing (the tour moves to the dock).
 */
defineProps<{ canClear: boolean; tourActive: boolean }>()
const emit = defineEmits<{ clear: []; settings: []; minimize: []; close: [] }>()
const { t } = useI18n()
</script>

<template>
  <header class="border-border flex h-10 shrink-0 items-center gap-3.5 border-b px-4 font-mono whitespace-nowrap text-xs font-medium tracking-[0.02em] uppercase">
    <h2 id="ask-ai-title" class="text-foreground shrink-0">{{ t('ai.title') }}</h2>
    <span class="text-muted-foreground min-w-0 truncate">{{ t('ai.subtitle') }}</span>
    <span class="flex-1" />
    <div class="-mr-1.5 flex shrink-0 items-center">
      <Button
        v-if="canClear"
        variant="ghost"
        size="sm"
        class="px-1.5 max-sm:h-11!"
        :aria-label="t('ai.clear')"
        data-testid="ask-ai-clear"
        @click="emit('clear')"
      >
        {{ t('ai.clearShort') }}
      </Button>
      <Button variant="ghost" size="sm" class="px-1.5 max-sm:h-11!" data-testid="ask-ai-settings-button" @click="emit('settings')">
        {{ t('ai.settings') }}
      </Button>
      <Button v-if="tourActive" variant="ghost" size="sm" class="px-1.5 max-sm:h-11!" data-testid="ask-ai-minimize" @click="emit('minimize')">
        {{ t('ai.minimize') }}
      </Button>
      <Button variant="secondary" size="sm" hotkey="ESC" class="px-1.5 max-sm:h-11!" data-testid="ask-ai-close" @click="emit('close')">
        {{ t('ai.close') }}
      </Button>
    </div>
    <p id="ask-ai-description" class="sr-only">{{ t('ai.description') }}</p>
  </header>
</template>
