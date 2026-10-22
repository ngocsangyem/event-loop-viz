<script setup lang="ts">
import { computed, nextTick, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AskAiError, ERROR_KEYS } from '../ai/openrouter-error'
import DriveAiSettings from './drive-ai-settings.vue'
import DriveNotice from './drive-notice.vue'
import DriveSpotlight from './drive-spotlight.vue'
import { DriveNeedsKeyError } from './drive-ai-steps'
import type { DriveSession } from './use-drive-session'

/**
 * The spotlight of a running Drive me session. A step lights its spot; while the steps load, or
 * when none fit or they failed, the card stands alone as a notice under a full scrim. Without a
 * key the settings dialog opens by itself; saving it tries the same Run again.
 */
const props = defineProps<{ session: DriveSession; bottomReserve: number; layoutKey?: string }>()
const { t } = useI18n()

const step = computed(() => props.session.step.value)
const status = computed(() => props.session.status.value)
const error = computed(() => props.session.error.value)
const needsKey = computed(() => error.value instanceof DriveNeedsKeyError)
const keyRejected = computed(() => error.value instanceof AskAiError && error.value.kind === 'invalid-key')

const title = computed(() => {
  if (step.value) return step.value.title
  if (status.value === 'loading') return t('drive.loading')
  if (status.value === 'empty') return t('drive.emptyTitle')
  if (needsKey.value) return t('drive.ai.keyTitle')
  if (error.value instanceof AskAiError) return t(`ai.errors.title.${ERROR_KEYS[error.value.kind]}`)
  return t('drive.errorTitle')
})
const body = computed(() => (step.value ? step.value.body : status.value === 'empty' ? t('drive.emptyBody') : ''))
const total = computed(() => (step.value ? props.session.steps.value.length : 0))

const settingsOpen = shallowRef(false)
/** Mounted on first need and kept: it loads OpenRouter's model list. */
const settingsMounted = shallowRef(false)
function openSettings() {
  settingsMounted.value = true
  settingsOpen.value = true
}
watch(needsKey, (missing) => missing && openSettings())
// The dialog has no trigger to return to: focus goes back to the card.
watch(settingsOpen, async (open) => {
  if (open) return
  await nextTick()
  document.querySelector<HTMLElement>('[data-testid="drive-popover"]')?.focus()
})
</script>

<template>
  <DriveSpotlight
    v-if="session.active.value"
    :spot="step"
    :index="session.index.value"
    :total="total"
    :title="title"
    :body="body"
    :note="step?.note"
    :info="step?.info"
    :code-line="step?.code"
    :bottom-reserve="bottomReserve"
    :layout-key="layoutKey"
    @next="session.next"
    @prev="session.prev"
    @end="session.end"
  >
    <DriveNotice v-if="status === 'error'" :error="error" @retry="session.retry" @settings="openSettings" />
  </DriveSpotlight>
  <DriveAiSettings v-if="settingsMounted" v-model:open="settingsOpen" :key-rejected="keyRejected" @saved="session.retry" />
</template>
