<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { UnsupportedUsage } from './unsupported-api-marks'

/** `usages` locate each reference; `apis` still names the ones the editor text could not place. */
const props = defineProps<{ apis: readonly string[]; usages: readonly UnsupportedUsage[] }>()
const { t } = useI18n()

/** One ruled row per API and line: `fetch · LINE 2`; an API with no found position keeps a bare row. */
const rows = computed(() => {
  const seen = new Set<string>()
  const out: { key: string; api: string; line: number | null }[] = []
  for (const usage of props.usages) {
    const key = `${usage.api}:${usage.line}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ key, api: usage.api, line: usage.line })
  }
  for (const api of props.apis) {
    if (!props.usages.some((u) => u.api === api)) out.push({ key: api, api, line: null })
  }
  return out
})
</script>

<template>
  <Alert v-if="apis.length" tone="error" class="mx-4 mb-4 w-auto" data-testid="unsupported-api-notice">
    <AlertTitle>{{ t('unsupported.title') }}</AlertTitle>
    <AlertDescription class="mt-1">
      <ul class="font-mono text-[12.5px] leading-[19px]">
        <li
          v-for="row in rows"
          :key="row.key"
          class="border-border-soft flex gap-2 border-t py-1 first:border-t-0"
        >
          <span class="text-error">{{ row.api }}</span>
          <template v-if="row.line !== null">
            <span aria-hidden="true" class="text-muted-foreground">·</span>
            <span class="text-muted-foreground uppercase">{{ t('unsupported.line', { line: row.line }) }}</span>
          </template>
        </li>
      </ul>
    </AlertDescription>
  </Alert>
</template>
