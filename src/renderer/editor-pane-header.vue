<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import ExamplePicker from './example-picker.vue'
import SupportedApis from './supported-apis.vue'
import DriveMeButton from './drive/drive-me-button.vue'
import type { Example } from '@/examples/example-library'

/** The 40px pane header: Script controls while editing, the Source label during replay. */
defineProps<{
  mode: 'edit' | 'source'
  running: boolean
  examples: readonly Example[]
  currentExampleId: string | null
  /** A Drive me walkthrough is on. */
  driving: boolean
}>()
const emit = defineEmits<{ edit: []; 'load-example': [id: string]; drive: [] }>()
const { t } = useI18n()
</script>

<template>
  <header
    class="border-border-soft flex h-10 items-center gap-3 border-b px-4 max-sm:gap-2 font-mono text-xs leading-none font-medium tracking-[0.02em] uppercase"
  >
    <template v-if="mode === 'edit'">
      <h2 class="text-foreground font-medium">{{ t('editor.title') }}</h2>
      <span :class="['min-w-0 truncate', running ? 'text-brand-text' : 'text-muted-foreground']" data-testid="editor-state">
        {{ running ? t('editor.locked') : t('editor.editing') }}
      </span>
      <span class="flex-1" />
      <DriveMeButton compact :active="driving" @toggle="emit('drive')" />
      <ExamplePicker :examples="examples" :current-id="currentExampleId" @load="emit('load-example', $event)" />
      <SupportedApis />
    </template>
    <template v-else>
      <h2 class="text-foreground font-medium">{{ t('editor.sourceTitle') }}</h2>
      <span class="text-muted-foreground min-w-0 truncate" data-testid="replay-banner">{{ t('editor.readOnlyTag') }}</span>
      <span class="flex-1" />
      <DriveMeButton compact :active="driving" @toggle="emit('drive')" />
      <!-- Going back to Edit discards the Trace; the accessible name says so. -->
      <Button variant="ghost" size="sm" hotkey="E" :aria-label="t('editor.edit')" @click="emit('edit')">
        {{ t('editor.editLabel') }}
      </Button>
    </template>
  </header>
</template>
