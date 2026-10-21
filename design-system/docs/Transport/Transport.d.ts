/**
 * `<elv-transport>`: the transport row of the control dock, mono words with printed keys
 * (`[⌥←]TASK [⇧←]TICK [←]STEP [␣]PLAY [→]STEP [⇧→]TICK [⌥→]TASK`). PLAY is the only primary control.
 * Native custom element, registered by _ds_bundle.js. It does not bind keyboard shortcuts; the app
 * does. Event: `control`, with the control id in `event.detail[0]`.
 */
export type TransportControl =
  | 'task-back' | 'tick-back' | 'step-back' | 'play' | 'pause'
  | 'step-forward' | 'tick-forward' | 'task-forward'

export interface TransportProps {
  /** Playback is running: the PLAY control becomes PAUSE and emits `pause`. */
  playing?: boolean
  /** Playhead is at the first Trace Event: disables task/tick/step back. Attribute: `at-start`. */
  atStart?: boolean
  /** Playhead is at the last Trace Event: disables step/tick/task forward. Attribute: `at-end`. */
  atEnd?: boolean
  /** Individual controls to disable: array or JSON string of control ids. */
  disabled?: TransportControl[] | string
  /** touch = phone dock: five 52px targets `← TICK` `← STEP` `PLAY` `STEP →` `TICK →`, no hotkeys. */
  layout?: 'desktop' | 'touch'
}
