<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const props = defineProps<{
  examples: readonly { id: string; title: string; description: string }[]
  /** Id of the example the Script currently matches; null once it was edited away from one. */
  currentId: string | null
}>()
const emit = defineEmits<{ load: [id: string] }>()
const { t, te } = useI18n()

/** Example ids are kebab-case; message keys are camelCase. Falls back to the library's English. */
function text(id: string, field: 'title' | 'description', fallback: string): string {
  const key = `examples.items.${id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}.${field}`
  return te(key) ? t(key) : fallback
}

const currentName = computed(() => {
  const current = props.examples.find((e) => e.id === props.currentId)
  return current ? text(current.id, 'title', current.title) : t('examples.custom')
})
</script>

<template>
  <!-- Non-modal: a modal menu aria-hides the page while focusable controls stay under it. -->
  <DropdownMenu :modal="false">
    <DropdownMenuTrigger as-child>
      <!-- The name truncates on narrow panes and hides below sm; aria-label keeps it whole. -->
      <Button
        variant="ghost"
        size="sm"
        class="h-auto self-stretch"
        :aria-label="`${t('examples.button')}: ${currentName}`"
        data-testid="example-library"
      >
        <span class="text-foreground-2">{{ t('examples.button') }}</span>
        <span class="text-foreground max-w-48 truncate normal-case max-sm:hidden">{{ currentName }}</span>
        <span aria-hidden="true" class="text-muted-foreground">▾</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-80">
      <DropdownMenuLabel>{{ t('examples.menuLabel') }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="example in examples"
        :key="example.id"
        :data-testid="`example-${example.id}`"
        class="h-auto flex-col items-start gap-0.5 py-2"
        @select="emit('load', example.id)"
      >
        <span class="font-medium">{{ text(example.id, 'title', example.title) }}</span>
        <span class="text-foreground-2 text-xs">{{ text(example.id, 'description', example.description) }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
