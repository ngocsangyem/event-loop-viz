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
import { conceptCallHighlight } from './concept-call-highlight'
import { setUnsupportedApis, unsupportedApiMarks } from './unsupported-api-marks'
import { queuedLineGutter, setQueuedLines } from './queued-line-markers'
import type { QueuedConcept } from './queued-line-markers'
import './script-editor.css'

/** The Script text; edits in the editor write it back. */
const script = defineModel<string>({ required: true })
const props = defineProps<{
  /** No edits: during a Run and during replay. */
  readOnly: boolean
  /** Replay look: Source columns (number, queued work) and the current row on its rule. */
  source?: boolean
  errorAt?: SyntaxErrorPosition | null
  /** The engine's message, shown on the lint row under the failing line. */
  errorMessage?: string
  unsupportedApis?: readonly string[]
  /** Lines (1-based) with work still queued at the playhead, by concept. */
  queuedLines?: ReadonlyMap<number, QueuedConcept[]>
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
const queuedCompartment = new Compartment()
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
        queuedCompartment.of(props.source ? queuedLineGutter() : []),
        conceptCallHighlight(),
        unsupportedApiMarks(),
        sourceHighlight(),
        labelCompartment.of(scriptLabel()),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) script.value = update.state.doc.toString()
        }),
      ],
    }),
  })
  view.dispatch({ effects: setUnsupportedApis.of(props.unsupportedApis ?? []) })
  pushQueuedLines()
})

watch(
  () => props.source,
  (source) => {
    view?.dispatch({ effects: queuedCompartment.reconfigure(source ? queuedLineGutter() : []) })
    pushQueuedLines()
  },
)

function pushQueuedLines() {
  view?.dispatch({ effects: setQueuedLines.of(new Map(props.queuedLines ?? [])) })
}
watch(() => props.queuedLines, pushQueuedLines)

watch(
  () => props.unsupportedApis,
  (apis) => view?.dispatch({ effects: setUnsupportedApis.of(apis ?? []) }),
)

watch(
  () => props.readOnly,
  (readOnly) =>
    view?.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)) }),
)

watch(locale, () => view?.dispatch({ effects: labelCompartment.reconfigure(scriptLabel()) }))

watch(
  () => [props.errorAt, props.errorMessage] as const,
  ([at, message]) => {
    if (view)
      view.dispatch({
        effects: errorCompartment.reconfigure(syntaxErrorMarker(view.state, at ?? null, message)),
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

/** Puts the caret at the start of a 1-based line and scrolls it into view. */
function goToLine(line: number) {
  if (!view) return
  const target = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines))
  view.dispatch({ selection: { anchor: target.from }, effects: EditorView.scrollIntoView(target.from, { y: 'center' }) })
  view.focus()
}

defineExpose({ focus: () => view?.focus(), goToLine })
</script>

<template>
  <div ref="host" class="script-editor" :data-source="source ? '' : undefined" />
</template>
