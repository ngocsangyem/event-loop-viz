<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import AdvancedSettings from './advanced-settings.vue'
import { budgetSummary } from './run-settings-model'
import type { EditableRunSettings } from './run-settings-model'
import { runHotkeyLabel } from './run-hotkey-label'

/**
 * The 56px footer: Run settings and Budget summary, then Run, or the Recording state with Cancel.
 * On a phone it is pinned to the bottom of the SCRIPT tab, where it replaces the playback dock.
 */
defineProps<{ running: boolean; blocked: boolean }>()
const settings = defineModel<EditableRunSettings>('settings', { required: true })
const emit = defineEmits<{ run: []; cancel: [] }>()

const { t, locale } = useI18n()
const runButton = useTemplateRef<InstanceType<typeof Button>>('runButton')
const budget = computed(() => {
  const { tasks, events, seconds } = budgetSummary(settings.value)
  const format = (n: number) => n.toLocaleString(locale.value)
  return t('editor.budget', { tasks: format(tasks), events: format(events), seconds: format(seconds) })
})
const runHotkey = runHotkeyLabel()
defineExpose({ focusRun: () => (runButton.value?.$el as HTMLElement | undefined)?.focus() })
</script>

<template>
  <footer class="border-border bg-background mt-auto flex h-14 shrink-0 items-center gap-4 border-t px-4 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:h-16">
    <AdvancedSettings v-model="settings" />
    <span class="text-muted-foreground min-w-0 truncate font-mono text-[11.5px] leading-4 uppercase" :title="budget">{{ budget }}</span>
    <span class="flex-1" />
    <template v-if="running">
      <span class="text-foreground-2 flex shrink-0 items-center gap-1.5 font-mono whitespace-nowrap text-[12.5px] leading-none">
        <!-- A fixed 14px cell: the glyph changes per frame without moving the words beside it. -->
        <span class="recording-spinner text-brand" aria-hidden="true">
          <span>✻</span><span>✼</span><span>✽</span><span>✼</span>
        </span>
        <!-- A phone keeps the spinner and Cancel; the words would push Cancel off the edge. -->
        <span class="max-sm:sr-only">{{ t('editor.recording') }}</span>
      </span>
      <Button variant="destructive" size="lg" hotkey="ESC" @click="emit('cancel')">{{ t('editor.cancel') }}</Button>
    </template>
    <Button v-else ref="runButton" size="lg" class="max-md:h-12 max-md:px-6" :hotkey="runHotkey" :disabled="blocked" @click="emit('run')">
      {{ t('editor.run') }}
    </Button>
  </footer>
</template>

<style scoped>
.recording-spinner {
  position: relative;
  display: inline-block;
  width: 14px;
  height: 14px;
  text-align: center;
}
/* One glyph per frame; stepped opacity swaps them without animating layout. */
.recording-spinner > span {
  position: absolute;
  inset: 0;
  opacity: 0;
  animation: spinner-frame calc(var(--spinner-frame) * 4) steps(1, end) infinite;
}
.recording-spinner > span:nth-child(1) { animation-delay: calc(var(--spinner-frame) * -4); }
.recording-spinner > span:nth-child(2) { animation-delay: calc(var(--spinner-frame) * -3); }
.recording-spinner > span:nth-child(3) { animation-delay: calc(var(--spinner-frame) * -2); }
.recording-spinner > span:nth-child(4) { animation-delay: calc(var(--spinner-frame) * -1); }
@keyframes spinner-frame {
  0% { opacity: 1; }
  25%, 100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .recording-spinner > span { animation: none; }
  .recording-spinner > span:first-child { opacity: 1; }
}
</style>
