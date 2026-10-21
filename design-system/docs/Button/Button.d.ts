/**
 * `<elv-button>`: a control drawn as a mono uppercase word with its hotkey printed before it
 * (`[⌘↵]RUN`). Native custom element, registered by _ds_bundle.js. The word is the default slot.
 */
export interface ButtonProps {
  /** primary = ink fill (one per row: PLAY, SAVE, RUN); secondary = text-only word (default);
   *  outline = 1px line border, a toggle when `pressed` is set (ASK AI); destructive = red outline (CANCEL). */
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive'
  /** Printed hotkey shown as `[hotkey]`, e.g. "⌘↵", "⇧→", "A". Not printed when size="touch". */
  hotkey?: string
  /** Accessible name when the word alone is ambiguous, e.g. "Next Tick (Shift →)". */
  label?: string
  disabled?: boolean
  /** Toggle state for `variant="outline"`: ink border + hover-row fill when true. */
  pressed?: boolean
  /** touch = 44px tall phone target. */
  size?: 'default' | 'touch'
  type?: 'button' | 'submit'
  /** Default slot: the word, e.g. "STEP". */
  children?: unknown
}
