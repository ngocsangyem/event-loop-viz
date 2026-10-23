<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { exampleVideo } from '@/examples/example-videos'
import type { VideoLang } from '@/examples/example-videos'
import ExampleVideoDialog from './example-video-dialog.vue'

/**
 * The "Video lesson" word in the Script pane header. It shows only while the Script is an example
 * that has a rendered lesson video, and plays it in the app's language. Editing the Script away
 * from the example, or loading another one, closes the player.
 */
const props = defineProps<{
  examples: readonly { id: string; title: string }[]
  currentExampleId: string | null
}>()
const emit = defineEmits<{ opened: [] }>()
const { t, te, locale } = useI18n()
const open = shallowRef(false)

const video = computed(() => exampleVideo(props.currentExampleId, locale.value as VideoLang))
const title = computed(() => {
  const example = props.examples.find((e) => e.id === props.currentExampleId)
  if (!example) return ''
  const key = `examples.items.${example.id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}.title`
  return te(key) ? t(key) : example.title
})

watch(
  () => props.currentExampleId,
  () => (open.value = false),
)

function play() {
  open.value = true
  emit('opened')
}
</script>

<template>
  <template v-if="video">
    <Button
      variant="ghost"
      size="sm"
      class="shrink-0"
      :aria-label="t('video.playLabel', { title })"
      data-testid="example-video-button"
      @click="play"
    >
      <!-- Below sm the header has no room for words: the play glyph alone, named by aria-label. -->
      <span aria-hidden="true">▶<span class="max-sm:hidden"> {{ t('video.play') }}</span></span>
    </Button>
    <ExampleVideoDialog v-model:open="open" :video="video" :title="title" />
  </template>
</template>
