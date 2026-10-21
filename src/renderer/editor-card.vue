<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { LoaderCircleIcon } from '@lucide/vue'
import type { SharedSettings } from '@/share/share-link-codec'
import { EXAMPLES } from '@/examples/example-library'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Kbd } from '@/components/ui/kbd'
import ScriptEditor from './script-editor.vue'
import ExamplePicker from './example-picker.vue'
import AdvancedSettings from './advanced-settings.vue'
import SupportedApis from './supported-apis.vue'
import UnsupportedApiNotice from './unsupported-api-notice.vue'
import type { SourceHighlight } from './source-highlight'
import type { SyntaxErrorPosition } from './syntax-error-marker'

/** The Script editor with everything that acts on the Script: Run, examples and settings. */
defineProps<{
  replaying: boolean
  running: boolean
  syntaxError: string | null
  syntaxErrorAt: SyntaxErrorPosition | null
  highlight: SourceHighlight | null
  unsupportedApis: readonly string[]
}>()
const script = defineModel<string>('script', { required: true })
const settings = defineModel<SharedSettings>('settings', { required: true })
const emit = defineEmits<{ run: []; cancel: []; edit: []; 'load-example': [id: string] }>()

const { t } = useI18n()
const editor = useTemplateRef('editor')
const runButton = useTemplateRef<InstanceType<typeof Button>>('runButton')
defineExpose({
  focus: () => editor.value?.focus(),
  focusRun: () => (runButton.value?.$el as HTMLElement | undefined)?.focus(),
})
</script>

<template>
  <Card size="sm" class="min-w-0 gap-3" role="region" :aria-label="t('editor.region')">
    <CardHeader>
      <CardTitle>{{ t('editor.code') }}</CardTitle>
      <CardAction class="flex items-center gap-1.5">
        <Button v-if="running" variant="destructive" size="sm" @click="emit('cancel')">
          {{ t('editor.cancel') }}
        </Button>
        <Button ref="runButton" size="sm" :disabled="running" @click="emit('run')">
          <LoaderCircleIcon v-if="running" class="animate-spin" />
          <Kbd v-else aria-hidden="true" class="text-primary-foreground/70 hidden sm:inline-flex">⌘↵</Kbd>
          {{ t('editor.run') }}
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent class="flex flex-col gap-2">
      <!-- The action flows after the text and wraps under it, so a long label never covers it. -->
      <Alert v-if="replaying" data-testid="replay-banner" class="flex! flex-wrap items-center justify-between gap-2 py-2 pr-3!">
        <AlertDescription>{{ t('editor.readOnly') }}</AlertDescription>
        <AlertAction class="static">
          <Button variant="outline" size="xs" @click="emit('edit')">
            {{ t('editor.edit') }}
          </Button>
        </AlertAction>
      </Alert>
      <progress v-if="running" class="sr-only" :aria-label="t('editor.running')">{{ t('editor.runningText') }}</progress>
      <ScriptEditor
        ref="editor"
        v-model="script"
        :read-only="replaying"
        :error-at="syntaxErrorAt"
        :highlight="highlight"
        @run="emit('run')"
      />
      <Alert v-if="syntaxError" variant="destructive">
        <AlertDescription>{{ syntaxError }}</AlertDescription>
      </Alert>
      <UnsupportedApiNotice :apis="unsupportedApis" />
    </CardContent>
    <CardFooter class="flex flex-wrap gap-1 border-t !py-2">
      <ExamplePicker :examples="EXAMPLES" @load="emit('load-example', $event)" />
      <AdvancedSettings v-model="settings" />
      <SupportedApis />
    </CardFooter>
  </Card>
</template>
