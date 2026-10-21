<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { haltMessage } from './run-settings-model'
import type { HaltReason } from '../trace/trace-event'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'

const props = defineProps<{ halt: { reason: HaltReason; limit?: number } | null }>()
/** Raising the Budget happens in Run settings, which live with the Script. */
const emit = defineEmits<{ 'raise-budget': [] }>()
const { t, locale } = useI18n()
const message = computed(() =>
  props.halt ? haltMessage(props.halt.reason, props.halt.limit, t, locale.value) : null,
)
const title = computed(() =>
  props.halt && props.halt.reason !== 'natural' ? t('banner.halt', { name: t(`halt.name.${props.halt.reason}`) }) : '',
)
</script>

<template>
  <!-- One 44px row: label, the sentence, and the way out. -->
  <Alert
    v-if="message"
    tone="halt"
    role="status"
    data-testid="halt-banner"
    class="flex min-h-(--banner-h) flex-wrap items-center gap-x-4 gap-y-1"
  >
    <AlertTitle class="shrink-0">{{ title }}</AlertTitle>
    <AlertDescription class="min-w-0 flex-1">{{ message }}</AlertDescription>
    <AlertAction class="shrink-0">
      <button type="button" class="uppercase" :title="t('banner.raiseBudgetHint')" @click="emit('raise-budget')">
        {{ t('banner.raiseBudget') }}
      </button>
    </AlertAction>
  </Alert>
</template>
