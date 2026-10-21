import { onScopeDispose } from 'vue'
import type { useTraceNavigation, JumpUnit } from './use-trace-navigation'

type Navigation = ReturnType<typeof useTraceNavigation>

/** Typing in the editor or a field must never trigger transport shortcuts. */
function isTyping(el: HTMLElement): boolean {
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Space activates a focused control; it only toggles playback when nothing else owns it. */
const OWNS_SPACE = 'button, a[href], summary, [role=button]'

/** Menus, listboxes, toggle groups and sliders use arrows, Home and End for their own focus. */
const OWNS_KEYS = '[role=menu], [role=listbox], [role=group], [role=radiogroup], [role=slider], [role=combobox]'

/**
 * Page-wide playback keys: Space plays/pauses, arrows step, Shift/Alt+arrows jump a Tick/Task,
 * Home/End go to the ends. The listener lives as long as the calling component.
 */
export function useTransportShortcuts(
  nav: Navigation,
  playback: { enabled: () => boolean; toggle: () => void; pause: () => void },
) {
  function onKeydown(event: KeyboardEvent) {
    const target = event.target instanceof HTMLElement ? event.target : null
    if (!playback.enabled() || event.defaultPrevented) return
    if (target && (isTyping(target) || target.closest(OWNS_KEYS))) return
    // Ctrl/Cmd belong to the browser and OS; Shift and Alt alone select the jump unit.
    if (event.ctrlKey || event.metaKey || (event.shiftKey && event.altKey)) return
    const modified = event.shiftKey || event.altKey
    const unit: JumpUnit = event.shiftKey ? 'Tick' : 'Task'
    const actions: Record<string, () => void> = modified
      ? {
          ArrowRight: () => nav.jumpBy(unit, 'next'),
          ArrowLeft: () => nav.jumpBy(unit, 'prev'),
        }
      : {
          ' ': playback.toggle,
          ArrowRight: () => nav.step('next'),
          ArrowLeft: () => nav.step('prev'),
          Home: () => nav.jump('first'),
          End: () => nav.jump('last'),
        }
    if (event.key === ' ' && target?.closest(OWNS_SPACE)) return
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    // Manual navigation takes over from autoplay, except the play/pause toggle itself.
    if (event.key !== ' ') playback.pause()
    action()
  }

  window.addEventListener('keydown', onKeydown)
  onScopeDispose(() => window.removeEventListener('keydown', onKeydown))
}
