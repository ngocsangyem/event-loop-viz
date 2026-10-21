<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { MonitorIcon, MoonIcon, SunIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LOCALES, LOCALE_NAMES } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'
import type { ThemeChoice } from './use-color-theme'
import type { VisualizerView } from './use-visualizer-view'

/**
 * Title, the Panels/Diagram/3D view switch, Share, language and colour theme. Set as a 48px
 * terminal bar: lowercase title, mono meta, nav words; the active view has a 2px ink underline.
 */
defineProps<{ shareUrl: string | null; shareCopied: boolean }>()
const view = defineModel<VisualizerView>('view', { required: true })
const theme = defineModel<ThemeChoice>('theme', { required: true })
const locale = defineModel<Locale>('locale', { required: true })
const emit = defineEmits<{ share: [] }>()

const { t } = useI18n()
const shareOpen = shallowRef(false)

function onView(value: unknown) {
  // A single-select toggle group emits undefined when the active item is clicked again.
  if (value === 'panels' || value === 'diagram' || value === '3d') view.value = value
}

const VIEWS = [
  { value: 'panels', label: 'header.panels', aria: 'header.panelsView' },
  { value: 'diagram', label: 'header.diagram', aria: 'header.diagramView' },
  { value: '3d', label: 'header.threeD', aria: 'header.threeDView' },
] as const

const THEMES = [
  { value: 'system', label: 'header.themeSystem', icon: MonitorIcon },
  { value: 'light', label: 'header.themeLight', icon: SunIcon },
  { value: 'dark', label: 'header.themeDark', icon: MoonIcon },
] as const
</script>

<template>
  <header class="border-border flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 border-b pb-2">
    <div class="mr-auto flex min-w-0 flex-wrap items-baseline gap-x-3">
      <!-- Titles are lowercase; the brand square is the one accent mark in the bar. -->
      <h1 class="flex items-center gap-2 text-base leading-tight font-semibold lowercase">
        <span class="bg-brand size-2.5 shrink-0" aria-hidden="true" />
        {{ t('app.title') }}
      </h1>
      <p class="label-mono text-muted-foreground text-[11px]">{{ t('app.tagline') }}</p>
    </div>
    <ToggleGroup
      type="single"
      size="sm"
      :spacing="0"
      :aria-label="t('header.visualization')"
      :model-value="view"
      @update:model-value="onView"
    >
      <ToggleGroupItem
        v-for="option in VIEWS"
        :key="option.value"
        :value="option.value"
        :aria-label="t(option.aria)"
        :data-testid="`view-${option.value}`"
        class="gap-1 data-[state=on]:bg-transparent data-[state=on]:shadow-[inset_0_-2px_0_var(--foreground)]"
      >
        {{ t(option.label) }}
      </ToggleGroupItem>
    </ToggleGroup>
    <Popover v-model:open="shareOpen">
      <PopoverTrigger as-child>
        <Button variant="ghost" size="sm" @click="emit('share')">
          {{ t('header.share') }}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" class="w-96">
        <p class="text-xs font-medium">
          {{ shareCopied ? t('header.shareCopied') : t('header.shareHint') }}
        </p>
        <Input v-if="shareUrl" data-testid="share-url" :aria-label="t('header.shareUrl')" :model-value="shareUrl" readonly class="h-7 font-mono text-xs" />
      </PopoverContent>
    </Popover>
    <Select v-model="locale">
      <SelectTrigger size="sm" :aria-label="t('header.language')" data-testid="locale" class="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="option in LOCALES" :key="option" :value="option" :lang="option">
          {{ LOCALE_NAMES[option] }}
        </SelectItem>
      </SelectContent>
    </Select>
    <Select v-model="theme">
      <SelectTrigger size="sm" :aria-label="t('header.theme')" class="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="option in THEMES" :key="option.value" :value="option.value">
          <component :is="option.icon" />
          {{ t(option.label) }}
        </SelectItem>
      </SelectContent>
    </Select>
  </header>
</template>
