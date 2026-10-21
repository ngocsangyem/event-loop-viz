<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ChevronDownIcon, SparklesIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'

/**
 * The round button in the bottom-right corner that opens and closes the Ask AI panel, like the
 * chat launcher of a support widget. It is tiny and loads with the page; the panel loads on demand.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
const { t } = useI18n()
</script>

<template>
  <Button
    class="h-12 shrink-0 rounded-full px-4 shadow-lg max-sm:w-12 max-sm:px-0"
    :aria-label="open ? t('ai.launcher.close') : t('ai.launcher.open')"
    :aria-expanded="open"
    aria-controls="ask-ai-panel"
    data-testid="ask-ai"
    @click="emit('toggle')"
  >
    <ChevronDownIcon v-if="open" class="size-5" />
    <SparklesIcon v-else class="size-5" />
    <span class="max-sm:sr-only" aria-hidden="true">{{ t('ai.launcher.open') }}</span>
  </Button>
</template>
