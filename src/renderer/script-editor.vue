<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'

const props = defineProps<{ modelValue: string; readOnly: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; run: [] }>()

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null
// Read-only is a facet, not contenteditable=false, so the editor stays focusable and selectable.
const readOnlyCompartment = new Compartment()

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
.script-editor :deep(.cm-editor) {
  min-height: 12em;
}
</style>
