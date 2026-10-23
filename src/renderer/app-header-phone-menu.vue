<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LOCALES } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'
import type { ThemeChoice } from './use-color-theme'

/**
 * Phone only: the header's `MENU` (DESIGN.md · Layout — mobile). Language, theme and Share leave
 * the bar so the editor starts right under it. Drive me and Ask AI are here too, for the SCRIPT
 * tab, where the playback dock is replaced by the pinned Run.
 */
defineProps<{
  locale: Locale
  theme: ThemeChoice
  shareCopied: boolean
  driving: boolean
}>()
const emit = defineEmits<{ toggleLocale: []; toggleTheme: []; share: []; drive: []; ask: [] }>()
const { t } = useI18n()
</script>

<template>
  <!-- A real box: the menu root renders nothing, so it could not take the phone-only class itself. -->
  <div class="flex items-stretch md:hidden">
    <!-- Menu items are presentational to screen readers, so the copy result is announced from here. -->
    <span class="sr-only" aria-live="polite">{{ shareCopied ? t('header.shareCopied') : '' }}</span>
    <DropdownMenu :modal="false">
      <DropdownMenuTrigger as-child>
        <Button variant="secondary" size="touch" class="h-full px-3" data-testid="phone-menu">{{
          t('header.menu')
        }}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-64">
        <DropdownMenuItem
          class="h-11"
          data-testid="phone-menu-locale"
          @select="emit('toggleLocale')"
        >
          <span class="flex-1">{{ t('header.language') }}</span>
          <span class="sr-only">{{ locale.toUpperCase() }}</span>
          <span aria-hidden="true">
            <template v-for="(code, i) in LOCALES" :key="code">
              <span v-if="i > 0">/</span>
              <span :class="code === locale ? '' : 'text-muted-foreground'">{{
                code.toUpperCase()
              }}</span>
            </template>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem class="h-11" data-testid="phone-menu-theme" @select="emit('toggleTheme')">
          <span class="flex-1">{{ t('header.theme') }}</span>
          <span class="text-foreground-2">{{
            theme === 'dark' ? t('header.themeDark') : t('header.themeLight')
          }}</span>
        </DropdownMenuItem>
        <!-- Share stays open so the learner sees whether the link reached the clipboard. -->
        <DropdownMenuItem
          class="h-11"
          data-testid="phone-menu-share"
          @select.prevent="emit('share')"
        >
          <span class="flex-1">{{ t('header.share') }}</span>
          <span v-if="shareCopied" class="text-console">{{
            t('header.shareCopiedShort')
          }}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{{ t('header.guides') }}</DropdownMenuLabel>
        <DropdownMenuItem class="h-11" data-testid="phone-menu-drive" @select="emit('drive')">
          {{ driving ? t('drive.stop') : t('drive.start') }}
        </DropdownMenuItem>
        <DropdownMenuItem class="h-11" data-testid="phone-menu-ask" @select="emit('ask')">{{
          t('ai.launcher.open')
        }}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
