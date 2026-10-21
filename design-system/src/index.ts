/**
 * The Event Loop Visualizer design system as native custom elements (Vue `defineCustomElement`).
 * Loading the bundle registers every element, so markup like `<elv-pane>` works in any page.
 * Each element is also exported, and `register()` is idempotent for hosts that load it twice.
 */
import { defineCustomElement } from 'vue'
import Pane from './elements/elv-pane.ce.vue'
import Queue from './elements/elv-queue.ce.vue'

export { CONCEPTS } from './concepts'
export type { Concept } from './concepts'
export type { QueueRowItem } from './elements/elv-queue.ce.vue'

export const ElvPane = defineCustomElement(Pane)
export const ElvQueue = defineCustomElement(Queue)

/** Tag name → element class, in one place so the docs and `register()` agree. */
export const ELEMENTS = {
  'elv-pane': ElvPane,
  'elv-queue': ElvQueue,
} as const

export function register(): void {
  for (const [tag, element] of Object.entries(ELEMENTS)) {
    if (!customElements.get(tag)) customElements.define(tag, element)
  }
}

register()
