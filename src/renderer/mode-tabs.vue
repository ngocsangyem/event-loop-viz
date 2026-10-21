<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NavTabs } from '@/components/ui/nav-tabs'
import type { NavTabItem } from '@/components/ui/nav-tabs'
import type { ModeTab } from './use-app-layout'

/** Phone only: SCRIPT / REPLAY, 44px tall. Replay waits for a Trace, like the rest of the replay. */
const props = defineProps<{ canReplay: boolean }>()
const tab = defineModel<ModeTab>({ required: true })
const { t } = useI18n()

const items = computed((): NavTabItem[] => [
  { key: 'script', label: t('modeTabs.script') },
  { key: 'replay', label: t('modeTabs.replay'), disabled: !props.canReplay },
])
</script>

<template>
  <NavTabs
    fill
    height="44px"
    class="border-border border-b"
    data-testid="mode-tabs"
    :aria-label="t('modeTabs.label')"
    :items="items"
    :model-value="tab"
    @update:model-value="tab = $event as ModeTab"
  />
</template>
