<script setup lang="ts">
import { cn } from '@/lib/utils'

export interface QueueItem {
  id: string
  label: string
  detail?: string
  /** The entry that is running now; drawn highlighted. */
  active?: boolean
}

/** A vertical list of queue or stack entries with an empty state. Shared by every queue panel. */
defineProps<{ items: readonly QueueItem[]; empty: string; testid: string }>()
</script>

<template>
  <p v-if="items.length === 0" class="text-muted-foreground py-2 text-center text-xs">{{ empty }}</p>
  <ol v-else :data-testid="testid" class="flex flex-col gap-1.5">
    <li
      v-for="item in items"
      :key="item.id"
      :data-id="item.id"
      :aria-current="item.active ? 'step' : undefined"
      :class="
        cn(
          'bg-muted/60 flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors',
          item.active && 'border-primary/60 bg-primary/10 text-foreground',
        )
      "
    >
      <span class="truncate">{{ item.label }}</span>
      <span v-if="item.detail" class="text-muted-foreground shrink-0">{{ item.detail }}</span>
    </li>
  </ol>
</template>
