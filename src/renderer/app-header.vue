<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NavTabs } from '@/components/ui/nav-tabs'
import type { NavTabItem } from '@/components/ui/nav-tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { LOCALES, LOCALE_NAMES } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'
import type { ThemeChoice } from './use-color-theme'
import type { VisualizerView } from './use-visualizer-view'

/**
 * The 48px terminal bar (DESIGN.md · Layout): lowercase title and model tag, the Edit / Replay
 * mode, the view switch, then language, theme, Share and the KEYS ON/OFF switch. The active nav
 * item has a 2px ink underline. On a phone the bar wraps and the view switch takes its own row.
 */
const props = defineProps<{
  shareUrl: string | null
  shareCopied: boolean
  locale: Locale
  theme: ThemeChoice
  /** Whether printed hotkeys are shown. */
  keysOn: boolean
  mode: 'edit' | 'replay'
  /** Replay needs a Trace; without one it stays disabled. */
  canReplay: boolean
  /** Runs completed this session; 0 before the first. */
  runNumber: number
}>()
const view = defineModel<VisualizerView>('view', { required: true })
const shareOpen = defineModel<boolean>('shareOpen', { required: true })
const emit = defineEmits<{
  share: []
  edit: []
  replay: []
  toggleLocale: []
  toggleTheme: []
  toggleKeys: []
}>()

const { t } = useI18n()

const modeItems = computed((): NavTabItem[] => [
  { key: 'edit', label: t('header.edit'), hotkey: 'E' },
  {
    key: 'replay',
    label: props.runNumber > 0 ? t('header.replayRun', { n: props.runNumber }) : t('header.replay'),
    hotkey: 'R',
    disabled: !props.canReplay,
  },
])
const viewItems = computed((): NavTabItem[] => [
  { key: 'panels', label: t('header.panels'), hotkey: '1' },
  { key: 'diagram', label: t('header.diagram'), hotkey: '2' },
  { key: '3d', label: t('header.threeD'), hotkey: '3' },
])

function onMode(key: string) {
  if (key === 'edit') emit('edit')
  else emit('replay')
}
function onView(key: string) {
  if (key === 'panels' || key === 'diagram' || key === '3d') view.value = key
}

/** The language the toggle switches to, named in itself for the accessible name. */
const otherLocaleName = computed(() => LOCALE_NAMES[LOCALES.find((l) => l !== props.locale) ?? 'en'])
const headerButton = 'h-auto px-2'
</script>

<template>
  <header
    class="border-border flex h-(--header-h) items-stretch gap-7 border-b px-5 max-md:h-auto max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-0 max-md:px-3"
  >
    <div class="flex min-w-0 items-center gap-3 max-md:h-12">
      <!-- Titles are lowercase; the bar is flat, with no brand mark. -->
      <h1 class="font-sans text-base leading-none font-medium tracking-[-0.01em] lowercase">{{ t('app.title') }}</h1>
      <p class="font-mono text-[11px] leading-none font-medium tracking-[0.02em] text-muted-foreground uppercase max-sm:hidden">
        {{ t('app.tagline') }}
      </p>
    </div>
    <NavTabs
      class="max-md:hidden"
      height="auto"
      :aria-label="t('modeTabs.label')"
      :items="modeItems"
      :model-value="mode"
      @update:model-value="onMode"
    />
    <div class="flex-1" aria-hidden="true" />
    <NavTabs
      class="max-md:order-last max-md:w-full max-md:[&>button]:h-11 max-md:[&>button]:flex-1 max-md:[&>button]:justify-center"
      height="auto"
      :aria-label="t('header.visualization')"
      :items="viewItems"
      :model-value="view"
      @update:model-value="onView"
    />
    <div class="bg-border my-3.5 w-px shrink-0 max-md:hidden" aria-hidden="true" />
    <div class="flex items-stretch gap-1 max-md:ml-auto max-md:h-12">
      <Button
        variant="secondary"
        :class="headerButton"
        hotkey="L"
        data-testid="locale"
        :aria-label="t('header.languageSwitch', { name: otherLocaleName })"
        @click="emit('toggleLocale')"
      >
        <span aria-hidden="true">
          <template v-for="(code, i) in LOCALES" :key="code">
            <span v-if="i > 0">/</span>
            <span :class="code === locale ? '' : 'text-muted-foreground'">{{ code.toUpperCase() }}</span>
          </template>
        </span>
      </Button>
      <Button variant="secondary" :class="headerButton" hotkey="T" data-testid="theme" @click="emit('toggleTheme')">
        {{ theme === 'dark' ? t('header.themeDark') : t('header.themeLight') }}
      </Button>
      <Popover v-model:open="shareOpen">
        <PopoverTrigger as-child>
          <Button variant="secondary" :class="headerButton" hotkey="S" data-testid="share" @click="emit('share')">
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
      <Switch
        class="h-auto max-sm:hidden"
        data-testid="keys-toggle"
        :title="t('header.keysHint')"
        :model-value="keysOn"
        :label="t('header.keys')"
        :on-label="t('switch.on')"
        :off-label="t('switch.off')"
        @update:model-value="emit('toggleKeys')"
      />
    </div>
  </header>
</template>
