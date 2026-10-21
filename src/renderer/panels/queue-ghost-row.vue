<script setup lang="ts">
/**
 * Where an item just left a lane: transparent, dashed line, no hue rule, ink-3 text. It holds the
 * item's place for one step so the eye can follow it to its new lane. It is text only (no
 * callback chip), so a flight never sees two chips with one id; assistive tech skips it.
 */
defineProps<{ id: string; kind?: string; code?: string }>()
</script>

<template>
  <li class="queue-row-ghost text-muted-foreground flex flex-col gap-[3px] px-2.5 py-[7px]" aria-hidden="true">
    <div class="flex items-center gap-2 font-mono text-[11.5px] leading-[15px] font-medium">
      <span class="shrink-0">{{ id }}</span>
      <span v-if="kind" class="min-w-0 truncate font-sans text-xs leading-[15px] font-normal">{{ kind }}</span>
    </div>
    <span v-if="code" class="truncate font-mono text-[12.5px] leading-[18px]">{{ code }}</span>
  </li>
</template>
