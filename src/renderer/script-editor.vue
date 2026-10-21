<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { syntaxErrorMarker } from './syntax-error-marker'
import type { SyntaxErrorPosition } from './syntax-error-marker'
import { applySourceHighlight, sourceHighlight } from './source-highlight'
import type { SourceHighlight } from './source-highlight'
import { editorSyntaxTheme } from './editor-syntax-theme'

/** The Script text; edits in the editor write it back. */
const script = defineModel<string>({ required: true })
const props = defineProps<{
  readOnly: boolean
  errorAt?: SyntaxErrorPosition | null
  /** Ranges of the current replay position; null/absent clears the highlight. */
  highlight?: SourceHighlight | null
}>()
const emit = defineEmits<{ run: [] }>()

const { t, locale } = useI18n()
const host = useTemplateRef<HTMLElement>('host')
let view: EditorView | null = null
// Read-only is a facet, not contenteditable=false, so the editor stays focusable and selectable.
const readOnlyCompartment = new Compartment()
const errorCompartment = new Compartment()
// The accessible name follows the UI language, so it lives in a compartment too.
const labelCompartment = new Compartment()
const scriptLabel = () => EditorView.contentAttributes.of({ 'aria-label': t('editor.script') })

onMounted(() => {
  view = new EditorView({
    parent: host.value!,
    state: EditorState.create({
      doc: script.value,
      extensions: [
        // Placed before basicSetup so the run shortcut wins over the default newline binding.
        keymap.of([
          {
            key: 'Mod-Enter',
            preventDefault: true,
            run: () => {
              emit('run')
              return true
            },
          },
        ]),
        // basicSetup does not bind Tab to indentation, so Tab/Shift+Tab move focus out of the
        // editor and keyboard-only users are never trapped (do not add indentWithTab).
        basicSetup,
        javascript(),
        // Wrapping keeps the narrow editor column free of a horizontal scroller.
        EditorView.lineWrapping,
        editorSyntaxTheme,
        readOnlyCompartment.of(EditorState.readOnly.of(props.readOnly)),
        errorCompartment.of([]),
        sourceHighlight(),
        labelCompartment.of(scriptLabel()),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) script.value = update.state.doc.toString()
        }),
      ],
    }),
  })
})

watch(
  () => props.readOnly,
  (readOnly) =>
    view?.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)) }),
)

watch(locale, () => view?.dispatch({ effects: labelCompartment.reconfigure(scriptLabel()) }))

watch(
  () => props.errorAt,
  (at) => {
    if (view)
      view.dispatch({
        effects: errorCompartment.reconfigure(syntaxErrorMarker(view.state, at ?? null)),
      })
  },
)

watch(
  () => props.highlight,
  (highlight) => {
    if (view) applySourceHighlight(view, highlight ?? { source: null, cause: null })
  },
)

watch(
  script,
  (value) => {
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
    }
  },
)

onBeforeUnmount(() => view?.destroy())

defineExpose({ focus: () => view?.focus() })
</script>

<template>
  <div ref="host" class="script-editor" />
</template>

<style scoped>
.script-editor {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}
.script-editor :deep(.cm-syntax-error-line) {
  background: color-mix(in oklab, var(--destructive) 15%, transparent);
}
.script-editor :deep(.cm-syntax-error-mark) {
  text-decoration: underline wavy var(--destructive);
}
.script-editor :deep(.cm-source-highlight) {
  /* Light enough that syntax-coloured tokens (numbers) under it keep 4.5:1 contrast in the dark theme. */
  background: #ffd54f40;
  outline: 1px solid #f9a825;
}
.script-editor :deep(.cm-cause-highlight) {
  background: #4fc3f733;
  outline: 1px dashed #0288d1;
}
.script-editor :deep(.cm-editor) {
  min-height: 14em;
  font-size: 13px;
  background: var(--background);
  color: var(--foreground);
}
.script-editor :deep(.cm-scroller) {
  font-family: var(--font-mono);
}
.script-editor :deep(.cm-gutters) {
  background: var(--background);
  color: var(--muted-foreground);
  border-right: 1px solid var(--border);
}
.script-editor :deep(.cm-activeLine),
.script-editor :deep(.cm-activeLineGutter) {
  background: color-mix(in oklab, var(--muted) 60%, transparent);
}
.script-editor :deep(.cm-cursor) {
  border-left-color: var(--foreground);
}
.script-editor :deep(.cm-focused) {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}
</style>
