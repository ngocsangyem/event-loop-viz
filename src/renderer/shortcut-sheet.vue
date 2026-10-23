<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * The `?` sheet: the keyboard map from DESIGN.md in three groups. Keys are plain bracketed spans,
 * not the Kbd primitive, so KEYS OFF (which hides printed hotkeys) does not blank the list itself.
 */
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

/** Grouped the way the keys are used: moving through a replay, the guided modes, then the app. */
const GROUPS: { id: 'playback' | 'guides' | 'app'; rows: { keys: string[]; action: string }[] }[] = [
  {
    id: 'playback',
    rows: [
      { keys: ['␣'], action: 'play' },
      { keys: ['←', '→'], action: 'step' },
      { keys: ['⇧←', '⇧→'], action: 'tick' },
      { keys: ['⌥←', '⌥→'], action: 'task' },
      { keys: ['Home', 'End'], action: 'ends' },
    ],
  },
  {
    id: 'guides',
    rows: [
      { keys: ['D'], action: 'drive' },
      { keys: ['P', 'N'], action: 'tour' },
      { keys: ['A'], action: 'ask' },
      { keys: ['V'], action: 'trace' },
    ],
  },
  {
    id: 'app',
    rows: [
      { keys: ['⌘↵', 'Ctrl↵'], action: 'run' },
      { keys: ['E', 'R'], action: 'mode' },
      { keys: ['Esc'], action: 'esc' },
      { keys: ['1', '2', '3'], action: 'views' },
      { keys: ['L', 'T', 'S'], action: 'prefs' },
      { keys: ['?'], action: 'sheet' },
    ],
  },
]
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent data-testid="shortcut-sheet">
      <DialogHeader>
        <DialogTitle>{{ t('shortcuts.title') }}</DialogTitle>
      </DialogHeader>
      <DialogBody class="gap-4">
        <DialogDescription>{{ t('shortcuts.hint') }}</DialogDescription>
        <section v-for="group in GROUPS" :key="group.id" class="flex flex-col gap-1.5" :aria-labelledby="`shortcuts-${group.id}`">
          <h3 :id="`shortcuts-${group.id}`" class="label-mono text-muted-foreground border-border-soft border-b pb-1">
            {{ t(`shortcuts.groups.${group.id}`) }}
          </h3>
          <dl class="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-1.5">
            <template v-for="row in group.rows" :key="row.action">
              <dt class="text-foreground font-mono text-xs leading-5 font-medium tracking-[0.02em]">
                <span v-for="key in row.keys" :key="key" class="mr-1.5 whitespace-nowrap"><span class="text-muted-foreground">[</span>{{ key }}<span class="text-muted-foreground">]</span></span>
              </dt>
              <dd class="text-foreground-2 text-[13px] leading-5">{{ t(`shortcuts.${row.action}`) }}</dd>
            </template>
          </dl>
        </section>
      </DialogBody>
    </DialogContent>
  </Dialog>
</template>
