<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * The `?` sheet: the keyboard map from DESIGN.md as a two-column list. Keys are plain spans, not
 * the Kbd primitive, so KEYS OFF (which hides printed hotkeys) does not blank the list itself.
 */
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

const KEYMAP: { keys: string; action: string }[] = [
  { keys: '␣', action: 'play' },
  { keys: '← →', action: 'step' },
  { keys: '⇧← ⇧→', action: 'tick' },
  { keys: '⌥← ⌥→', action: 'task' },
  { keys: 'Home End', action: 'ends' },
  { keys: 'P N', action: 'tour' },
  { keys: 'A', action: 'ask' },
  { keys: 'V', action: 'trace' },
  { keys: 'D', action: 'drive' },
  { keys: 'E R', action: 'mode' },
  { keys: '⌘↵ Ctrl↵', action: 'run' },
  { keys: 'Esc', action: 'esc' },
  { keys: '1 2 3', action: 'views' },
  { keys: 'L T S', action: 'prefs' },
  { keys: '?', action: 'sheet' },
]
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent data-testid="shortcut-sheet">
      <DialogHeader>
        <DialogTitle>{{ t('shortcuts.title') }}</DialogTitle>
      </DialogHeader>
      <DialogBody class="gap-3">
        <DialogDescription>{{ t('shortcuts.hint') }}</DialogDescription>
        <dl class="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-1.5">
          <template v-for="row in KEYMAP" :key="row.action">
            <dt class="text-muted-foreground font-mono text-xs leading-5 font-medium tracking-[0.02em]">{{ row.keys }}</dt>
            <dd class="text-foreground-2 text-[13px] leading-5">{{ t(`shortcuts.${row.action}`) }}</dd>
          </template>
        </dl>
      </DialogBody>
    </DialogContent>
  </Dialog>
</template>
