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
/* Ruled, not boxed: one 1px line, square corners, the page tone behind the code. */
.script-editor {
  border: 1px solid var(--border);
  overflow: hidden;
}
.script-editor :deep(.cm-syntax-error-line) {
  background: var(--error-soft);
  box-shadow: inset 2px 0 0 var(--error);
}
.script-editor :deep(.cm-syntax-error-mark) {
  text-decoration: underline wavy var(--error);
  background: var(--error-soft);
}
/*
 * Orange means now: the range running at the playhead is underlined, and its line carries the
 * 2px accent rule. Neither gets a fill: any tint under the code drops some syntax colours below
 * 4.5:1.
 */
.script-editor :deep(.cm-source-highlight) {
  box-shadow: inset 0 -2px 0 var(--brand);
}
.script-editor :deep(.cm-line:has(.cm-source-highlight)) {
  box-shadow: inset 2px 0 0 var(--brand);
}
/* The range that scheduled the current Task or Job, in task blue. */
.script-editor :deep(.cm-cause-highlight) {
  background: var(--task-soft);
  outline: 1px dashed var(--task);
}
.script-editor :deep(.cm-editor) {
  min-height: 14em;
  font-size: var(--text-code);
  line-height: 22px;
  background: var(--background);
  color: var(--foreground);
}
.script-editor :deep(.cm-scroller) {
  font-family: var(--font-mono);
  font-variant-ligatures: none;
}
.script-editor :deep(.cm-gutters) {
  background: var(--background);
  color: var(--syn-gutter);
  border-right: 1px solid var(--border-soft);
}
.script-editor :deep(.cm-activeLine),
.script-editor :deep(.cm-activeLineGutter) {
  background: var(--color-hover-row);
}
.script-editor :deep(.cm-cursor) {
  border-left-color: var(--brand);
}
.script-editor :deep(.cm-selectionBackground),
.script-editor :deep(.cm-focused .cm-selectionBackground) {
  background: color-mix(in srgb, var(--brand) 22%, transparent) !important;
}
.script-editor :deep(.cm-focused) {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}
</style>
