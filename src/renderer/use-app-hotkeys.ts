import { onScopeDispose } from 'vue'
import { OWNS_KEYS, isTyping } from './use-transport-shortcuts'
import type { VisualizerView } from './use-visualizer-view'

export interface AppHotkeyActions {
  edit: () => void
  replay: () => void
  setView: (view: VisualizerView) => void
  toggleLocale: () => void
  toggleTheme: () => void
  toggleShare: () => void
  toggleAsk: () => void
  toggleTrace: () => void
  toggleDrive: () => void
  toggleSheet: () => void
  tourStep: (direction: 'prev' | 'next') => void
  /** ⌘↵ / Ctrl↵: Run the Script (a no-op while replaying or already running). */
  run: () => void
  /** Esc with nothing else to close: cancels a Run in flight. */
  cancelRun: () => void
}

const VIEW_KEYS: Record<string, VisualizerView> = { '1': 'panels', '2': 'diagram', '3': '3d' }

/** A modal dialog owns the keyboard while it is open; its own Esc and Tab handling must win. */
const OPEN_DIALOG = '[data-slot=dialog-content][data-state=open]'
/** An open popover (a Drive me "under the hood" note, a picker) closes on Esc by itself; Esc is its alone. */
const OPEN_POPOVER = '[data-slot=popover-content][data-state=open]'

/**
 * Page-wide app keys from DESIGN.md · Keyboard map, beyond the playback keys: E/R, 1/2/3, L/T/S,
 * A, V, D, P/N, ?, ⌘↵ and Esc. They never fire while typing (editor, fields), inside menus and
 * listboxes, or with a modifier the key does not use. Printing the keys is a separate switch
 * (KEYS ON/OFF); they work either way.
 */
export function useAppHotkeys(actions: AppHotkeyActions) {
  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing) return
    const target = event.target instanceof HTMLElement ? event.target : null
    const editable = target?.isContentEditable ?? false
    const inDialog = document.querySelector(OPEN_DIALOG) !== null

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
      // CodeMirror binds Mod-Enter itself; this covers focus anywhere else on the page.
      if (editable || inDialog) return
      event.preventDefault()
      actions.run()
      return
    }
    if (event.key === 'Escape') {
      if (!inDialog && !document.querySelector(OPEN_POPOVER)) actions.cancelRun()
      return
    }

    if (event.ctrlKey || event.metaKey || event.altKey || inDialog) return
    if (target && (isTyping(target) || target.closest(OWNS_KEYS))) return
    // `?` is Shift+/ on most layouts; every other key must come without Shift.
    if (event.shiftKey && event.key !== '?') return

    const key = event.key.toLowerCase()
    const view = VIEW_KEYS[key]
    const handlers: Record<string, () => void> = {
      e: actions.edit,
      r: actions.replay,
      l: actions.toggleLocale,
      t: actions.toggleTheme,
      s: actions.toggleShare,
      a: actions.toggleAsk,
      v: actions.toggleTrace,
      d: actions.toggleDrive,
      '?': actions.toggleSheet,
      p: () => actions.tourStep('prev'),
      n: () => actions.tourStep('next'),
    }
    const handler = view ? () => actions.setView(view) : handlers[key]
    if (!handler) return
    event.preventDefault()
    handler()
  }

  window.addEventListener('keydown', onKeydown)
  onScopeDispose(() => window.removeEventListener('keydown', onKeydown))
}
