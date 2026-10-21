<script setup lang="ts">
import { ref } from 'vue'
import { BoxIcon, LayoutGridIcon, MonitorIcon, MoonIcon, RefreshCwIcon, Share2Icon, SunIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ThemeChoice } from './use-color-theme'
import type { VisualizerView } from './use-visualizer-view'

/** Title, the Panels/3D view switch, Share and the colour theme. */
defineProps<{ shareUrl: string | null; shareCopied: boolean }>()
const view = defineModel<VisualizerView>('view', { required: true })
const theme = defineModel<ThemeChoice>('theme', { required: true })
const emit = defineEmits<{ share: [] }>()

const shareOpen = ref(false)

function onView(value: unknown) {
  // A single-select toggle group emits undefined when the active item is clicked again.
  if (value === 'panels' || value === '3d') view.value = value
}

const THEMES = [
  { value: 'system', label: 'System', icon: MonitorIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
] as const
</script>

<template>
  <header class="flex flex-wrap items-center gap-3">
    <div class="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg" aria-hidden="true">
      <RefreshCwIcon class="size-5" />
    </div>
    <div class="mr-auto min-w-0">
      <h1 class="text-base leading-tight font-semibold">Event Loop Visualizer</h1>
      <p class="text-muted-foreground text-xs">Step through a simulated browser event loop</p>
    </div>
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label="Visualization"
      :model-value="view"
      @update:model-value="onView"
    >
      <ToggleGroupItem value="panels" aria-label="Panels view" data-testid="view-panels">
        <LayoutGridIcon />
        Panels
      </ToggleGroupItem>
      <ToggleGroupItem value="3d" aria-label="3D view" data-testid="view-3d">
        <BoxIcon />
        3D
      </ToggleGroupItem>
    </ToggleGroup>
    <Popover v-model:open="shareOpen">
      <PopoverTrigger as-child>
        <Button variant="outline" size="sm" @click="emit('share')">
          <Share2Icon />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" class="w-96">
        <p class="text-xs font-medium">
          {{ shareCopied ? 'Link copied to the clipboard' : 'Copy this link to share the Script' }}
        </p>
        <Input v-if="shareUrl" data-testid="share-url" aria-label="Share URL" :model-value="shareUrl" readonly class="h-7 font-mono text-xs" />
      </PopoverContent>
    </Popover>
    <Select v-model="theme">
      <SelectTrigger size="sm" aria-label="Theme" class="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="option in THEMES" :key="option.value" :value="option.value">
          <component :is="option.icon" />
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </Select>
  </header>
</template>
