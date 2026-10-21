/**
 * `<elv-halt-banner>`: the 44px strip shown only when a Run halted on its Budget.
 * Native custom element, registered by _ds_bundle.js.
 * Slots: default = the one-sentence explanation; `actions` = right-side controls
 * (e.g. an `<elv-button slot="actions">Raise budget</elv-button>`); empty by default.
 */
export interface HaltBannerProps {
  /** Label words after "HALT ·". Default "TASK BUDGET"; also "MICROTASK BUDGET". */
  reason?: string
  /** Show the TIMING-SENSITIVE tag (the stop changes timing results). */
  timingSensitive?: boolean
  /** Default slot: the sentence. */
  children?: unknown
}
