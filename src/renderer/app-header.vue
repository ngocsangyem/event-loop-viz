<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BoxIcon, LanguagesIcon, LayoutGridIcon, MonitorIcon, MoonIcon, RefreshCwIcon, Share2Icon,
  SparklesIcon, SunIcon, WorkflowIcon,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LOCALES, LOCALE_NAMES } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'
import type { ThemeChoice } from './use-color-theme'
import type { VisualizerView } from './use-visualizer-view'

/** Title, the Panels/Diagram/3D view switch, Ask AI, Share, language and colour theme. */
defineProps<{ shareUrl: string | null; shareCopied: boolean }>()
const view = defineModel<VisualizerView>('view', { required: true })
const theme = defineModel<ThemeChoice>('theme', { required: true })
const locale = defineModel<Locale>('locale', { required: true })
const emit = defineEmits<{ share: []; ask: [] }>()

const { t } = useI18n()
const shareOpen = shallowRef(false)

function onView(value: unknown) {
  // A single-select toggle group emits undefined when the active item is clicked again.
  if (value === 'panels' || value === 'diagram' || value === '3d') view.value = value
}

const VIEWS = [
  { value: 'panels', label: 'header.panels', aria: 'header.panelsView', icon: LayoutGridIcon },
  { value: 'diagram', label: 'header.diagram', aria: 'header.diagramView', icon: WorkflowIcon },
  { value: '3d', label: 'header.threeD', aria: 'header.threeDView', icon: BoxIcon },
] as const

const THEMES = [
  { value: 'system', label: 'header.themeSystem', icon: MonitorIcon },
  { value: 'light', label: 'header.themeLight', icon: SunIcon },
  { value: 'dark', label: 'header.themeDark', icon: MoonIcon },
] as const
</script>

<template>
  <header class="flex flex-wrap items-center gap-3">
    <div class="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg" aria-hidden="true">
      <RefreshCwIcon class="size-5" />
    </div>
    <div class="mr-auto min-w-0">
      <h1 class="text-base leading-tight font-semibold">{{ t('app.title') }}</h1>
      <p class="text-muted-foreground text-xs">{{ t('app.tagline') }}</p>
    </div>
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
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
      >
        <component :is="option.icon" />
        {{ t(option.label) }}
      </ToggleGroupItem>
    </ToggleGroup>
    <Button size="sm" data-testid="ask-ai" @click="emit('ask')">
      <SparklesIcon />
      {{ t('header.askAi') }}
    </Button>
    <Popover v-model:open="shareOpen">
      <PopoverTrigger as-child>
        <Button variant="outline" size="sm" @click="emit('share')">
          <Share2Icon />
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
        <LanguagesIcon />
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
