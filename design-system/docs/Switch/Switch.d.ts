/**
 * `<elv-switch>`: a setting toggle drawn as a mono label plus an ON / OFF word (`AUTO-PLAY ON`).
 * Native custom element, registered by _ds_bundle.js. The label word is the default slot.
 * Space or Enter toggles it. Event: `change`, with the new boolean in `event.detail[0]`.
 */
export interface SwitchProps {
  /** Current state. The element also flips its own state on toggle, so it works uncontrolled. */
  checked?: boolean
  /** Printed hotkey shown as `[hotkey]` before the label, e.g. "K". */
  hotkey?: string
  /** Accessible name when the slot word alone is ambiguous. */
  label?: string
  disabled?: boolean
  /** Default slot: the setting word, e.g. "Auto-play", "Show all", "Keys". */
  children?: unknown
}
