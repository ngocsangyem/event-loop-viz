/**
 * `<elv-tabs>`: mode and view navigation as mono words; the active one is ink with a 2px inset ink
 * underline. Native custom element, registered by _ds_bundle.js. Arrow keys / Home / End move the
 * selection. Event: `change`, with the item id in `event.detail[0]`.
 */
export interface TabItem {
  id: string
  /** The word, e.g. "Edit". */
  label: string
  /** Printed hotkey, e.g. "E" renders `[E]EDIT`. Hidden when size="touch". */
  hotkey?: string
  /** Trailing meta, e.g. "Run #3" renders `[R]REPLAY · RUN #3`. */
  meta?: string
  disabled?: boolean
}

export interface TabsProps {
  /** Tab items: array (DOM property) or JSON string (attribute). */
  items?: TabItem[] | string
  /** Id of the active item. The element also updates it on selection. */
  value?: string
  /** Accessible name of the tablist, e.g. "Mode". */
  label?: string
  /** touch = 44px full-width equal columns for phones; hotkeys hidden. */
  size?: 'default' | 'touch'
}
