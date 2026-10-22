<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DriveInfo } from './drive-step'

/**
 * `ⓘ UNDER THE HOOD` on a step card: opens what the spec or MDN says about the mechanism the step
 * shows, with a link to the passage. A click opens it (it works on touch screens, unlike a hover
 * tooltip); Esc or a click outside closes it.
 */
defineProps<{ info: DriveInfo }>()
const { t } = useI18n()
</script>

<template>
  <Popover>
    <PopoverTrigger
      class="text-brand-text hover:text-foreground inline-flex items-center gap-1.5 self-start font-mono text-xs font-medium tracking-[0.02em] uppercase underline-offset-4 hover:underline"
      data-testid="drive-info"
    >
      <span aria-hidden="true">ⓘ</span>{{ t('drive.infoButton') }}
    </PopoverTrigger>
    <PopoverContent side="top" align="start" class="w-[min(340px,calc(100vw-32px))] gap-2 p-3" data-testid="drive-info-content">
      <p class="label-mono text-muted-foreground">{{ info.title }}</p>
      <p class="text-foreground-2 text-[13px] leading-[1.55]">{{ info.body }}</p>
      <a :href="info.url" target="_blank" rel="noopener noreferrer" class="font-mono text-xs">
        {{ t('drive.infoSource') }}: {{ info.source }} ↗
      </a>
    </PopoverContent>
  </Popover>
</template>
