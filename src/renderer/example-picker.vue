<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ChevronDownIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{ examples: readonly { id: string; title: string; description: string }[] }>()
const emit = defineEmits<{ load: [id: string] }>()
const { t, te } = useI18n()

/** Example ids are kebab-case; message keys are camelCase. Falls back to the library's English. */
function text(id: string, field: 'title' | 'description', fallback: string): string {
  const key = `examples.items.${id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}.${field}`
  return te(key) ? t(key) : fallback
}
</script>

<template>
  <!-- Non-modal: a modal menu aria-hides the page while focusable controls stay under it. -->
  <DropdownMenu :modal="false">
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" data-testid="example-library">
        {{ t('examples.button') }}
        <ChevronDownIcon class="text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-80">
      <DropdownMenuLabel>{{ t('examples.menuLabel') }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="example in examples"
        :key="example.id"
        :data-testid="`example-${example.id}`"
        class="flex-col items-start gap-0.5"
        @select="emit('load', example.id)"
      >
        <span class="font-medium">{{ text(example.id, 'title', example.title) }}</span>
        <span class="text-muted-foreground text-xs">{{ text(example.id, 'description', example.description) }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
