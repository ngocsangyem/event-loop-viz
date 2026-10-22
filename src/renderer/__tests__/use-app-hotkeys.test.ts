import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useAppHotkeys } from '../use-app-hotkeys'
import type { AppHotkeyActions } from '../use-app-hotkeys'

function setup() {
  const actions = {
    edit: vi.fn(), replay: vi.fn(), setView: vi.fn(), toggleLocale: vi.fn(), toggleTheme: vi.fn(),
    toggleShare: vi.fn(), toggleAsk: vi.fn(), toggleTrace: vi.fn(), toggleDrive: vi.fn(), toggleSheet: vi.fn(), tourStep: vi.fn(), run: vi.fn(),
    cancelRun: vi.fn(),
  } satisfies AppHotkeyActions
  const scope = effectScope()
  scope.run(() => useAppHotkeys(actions))
  return { actions, scope }
}

/** Dispatches on `target` (bubbling to window) and reports whether the app took the key. */
function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event.defaultPrevented
}

let ctx: ReturnType<typeof setup>
beforeEach(() => (ctx = setup()))
afterEach(() => {
  ctx.scope.stop()
  document.body.innerHTML = ''
})

describe('useAppHotkeys', () => {
  it('maps the letter and digit keys to their actions', () => {
    press('e'); press('r'); press('l'); press('t'); press('s'); press('a'); press('p'); press('n')
    press('?', { shiftKey: true })
    press('2')
    expect(ctx.actions.edit).toHaveBeenCalledOnce()
    expect(ctx.actions.replay).toHaveBeenCalledOnce()
    expect(ctx.actions.toggleLocale).toHaveBeenCalledOnce()
    expect(ctx.actions.toggleTheme).toHaveBeenCalledOnce()
    expect(ctx.actions.toggleShare).toHaveBeenCalledOnce()
    expect(ctx.actions.toggleAsk).toHaveBeenCalledOnce()
    expect(ctx.actions.toggleSheet).toHaveBeenCalledOnce()
    expect(ctx.actions.tourStep.mock.calls).toEqual([['prev'], ['next']])
    expect(ctx.actions.setView).toHaveBeenCalledWith('diagram')
  })

  it('stays silent while typing in a field or the editor', () => {
    const input = document.body.appendChild(document.createElement('input'))
    const editor = document.body.appendChild(document.createElement('div'))
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    expect(press('t', {}, input)).toBe(false)
    expect(press('t', {}, editor)).toBe(false)
    expect(ctx.actions.toggleTheme).not.toHaveBeenCalled()
  })

  it('ignores keys with an unrelated modifier', () => {
    press('t', { metaKey: true }); press('t', { ctrlKey: true }); press('t', { altKey: true }); press('t', { shiftKey: true })
    expect(ctx.actions.toggleTheme).not.toHaveBeenCalled()
  })

  it('runs on Mod+Enter outside the editor but leaves the editor to CodeMirror', () => {
    expect(press('Enter', { ctrlKey: true })).toBe(true)
    expect(ctx.actions.run).toHaveBeenCalledOnce()
    const editor = document.body.appendChild(document.createElement('div'))
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    press('Enter', { metaKey: true }, editor)
    expect(ctx.actions.run).toHaveBeenCalledOnce()
  })

  it('cancels a Run on Esc unless a dialog is open', () => {
    press('Escape')
    expect(ctx.actions.cancelRun).toHaveBeenCalledOnce()
    const dialog = document.body.appendChild(document.createElement('div'))
    dialog.dataset.slot = 'dialog-content'
    dialog.dataset.state = 'open'
    press('Escape'); press('t')
    expect(ctx.actions.cancelRun).toHaveBeenCalledOnce()
    expect(ctx.actions.toggleTheme).not.toHaveBeenCalled()
  })
})
