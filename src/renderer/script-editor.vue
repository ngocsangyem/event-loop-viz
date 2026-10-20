<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { syntaxErrorMarker } from './syntax-error-marker'
import type { SyntaxErrorPosition } from './syntax-error-marker'
import { applySourceHighlight, sourceHighlight } from './source-highlight'
import type { SourceHighlight } from './source-highlight'

const props = defineProps<{
  modelValue: string
  readOnly: boolean
  errorAt?: SyntaxErrorPosition | null
  /** Ranges of the current replay position; null/absent clears the highlight. */
  highlight?: SourceHighlight | null
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; run: [] }>()

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null
// Read-only is a facet, not contenteditable=false, so the editor stays focusable and selectable.
const readOnlyCompartment = new Compartment()
const errorCompartment = new Compartment()

onMounted(() => {
  view = new EditorView({
    parent: host.value!,
    state: EditorState.create({
      doc: props.modelValue,
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
        basicSetup,
        javascript(),
        readOnlyCompartment.of(EditorState.readOnly.of(props.readOnly)),
        errorCompartment.of([]),
        sourceHighlight(),
        EditorView.contentAttributes.of({ 'aria-label': 'Script' }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) emit('update:modelValue', update.state.doc.toString())
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
  () => props.modelValue,
  (value) => {
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
    }
  },
)

onBeforeUnmount(() => view?.destroy())
</script>

<template>
  <div ref="host" class="script-editor" />
</template>

<style scoped>
.script-editor {
  border: 1px solid #8884;
}
.script-editor :deep(.cm-syntax-error-line) {
  background: #c6282822;
}
.script-editor :deep(.cm-syntax-error-mark) {
  text-decoration: underline wavy #c62828;
}
.script-editor :deep(.cm-source-highlight) {
  background: #ffd54f66;
  outline: 1px solid #f9a825;
}
.script-editor :deep(.cm-cause-highlight) {
  background: #4fc3f733;
  outline: 1px dashed #0288d1;
}
.script-editor :deep(.cm-editor) {
  min-height: 12em;
}
</style>
