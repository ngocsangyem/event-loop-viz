<script setup lang="ts">
import { ChevronDownIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{ examples: readonly { id: string; title: string; description: string }[] }>()
const emit = defineEmits<{ load: [id: string] }>()
</script>

<template>
  <!-- Non-modal: a modal menu aria-hides the page while focusable controls stay under it. -->
  <DropdownMenu :modal="false">
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" data-testid="example-library">
        Examples
        <ChevronDownIcon class="text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-80">
      <DropdownMenuLabel>Load an example Script</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="example in examples"
        :key="example.id"
        :data-testid="`example-${example.id}`"
        class="flex-col items-start gap-0.5"
        @select="emit('load', example.id)"
      >
        <span class="font-medium">{{ example.title }}</span>
        <span class="text-muted-foreground text-xs">{{ example.description }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
