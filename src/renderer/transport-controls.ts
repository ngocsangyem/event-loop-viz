import type { JumpUnit, useTraceNavigation } from './use-trace-navigation'

type Navigation = ReturnType<typeof useTraceNavigation>

/** One dock control: message keys, printed key and what it does to the playhead. */
export interface TransportControl {
  id: string
  /** Message key of the control's name. */
  label: string
  /** Message key of the word printed on the control. */
  word: string
  /** Which end of the Trace disables it: back controls at the start, forward at the end. */
  side: 'start' | 'end'
  props: {
    id: string
    glyph: string
    glyphAfter?: boolean
    shortcut: string
    keyHint: string
    extra?: boolean
  }
  run: (nav: Navigation) => void
}

function control(
  side: 'start' | 'end',
  id: string,
  label: string,
  word: string,
  keys: { shortcut: string; keyHint: string; extra?: boolean },
  run: TransportControl['run'],
): TransportControl {
  return {
    id,
    label: `transport.${label}`,
    word: `transport.word.${word}`,
    side,
    props: { id, glyph: side === 'start' ? '←' : '→', glyphAfter: side === 'end', ...keys },
    run,
  }
}

const jump = (unit: JumpUnit, direction: 'prev' | 'next') => (nav: Navigation) => nav.jumpBy(unit, direction)

/** Back controls sit before Play/Pause, forward controls after it; `extra` ones hide on a phone. */
export const BACK_CONTROLS: TransportControl[] = [
  control('start', 'start', 'start', 'start', { shortcut: 'Home', keyHint: '⇱', extra: true }, (nav) => nav.jump('first')),
  control('start', 'back-task', 'backTask', 'task', { shortcut: 'Alt+←', keyHint: '⌥←', extra: true }, jump('Task', 'prev')),
  control('start', 'back-tick', 'backTick', 'tick', { shortcut: 'Shift+←', keyHint: '⇧←' }, jump('Tick', 'prev')),
  control('start', 'prev', 'prev', 'prev', { shortcut: '←', keyHint: '←' }, (nav) => nav.step('prev')),
]
export const FORWARD_CONTROLS: TransportControl[] = [
  control('end', 'next', 'next', 'next', { shortcut: '→', keyHint: '→' }, (nav) => nav.step('next')),
  control('end', 'forward-tick', 'forwardTick', 'tick', { shortcut: 'Shift+→', keyHint: '⇧→' }, jump('Tick', 'next')),
  control('end', 'forward-task', 'forwardTask', 'task', { shortcut: 'Alt+→', keyHint: '⌥→', extra: true }, jump('Task', 'next')),
  control('end', 'end', 'end', 'end', { shortcut: 'End', keyHint: '⇲', extra: true }, (nav) => nav.jump('last')),
]
