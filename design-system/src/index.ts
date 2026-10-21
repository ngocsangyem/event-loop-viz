/**
 * The Event Loop Visualizer design system as native custom elements (Vue `defineCustomElement`).
 * Loading the bundle registers every element, so markup like `<elv-pane>` works in any page.
 * Each element class is also exported under its component name (`window.ELV.Pane`), and
 * `register()` is idempotent for hosts that load it twice.
 */
import { defineCustomElement } from 'vue'
import AdmonitionSfc from './elements/elv-admonition.ce.vue'
import ButtonSfc from './elements/elv-button.ce.vue'
import CaptionSfc from './elements/elv-caption.ce.vue'
import ConsoleSfc from './elements/elv-console.ce.vue'
import HaltBannerSfc from './elements/elv-halt-banner.ce.vue'
import KbdSfc from './elements/elv-kbd.ce.vue'
import PaneSfc from './elements/elv-pane.ce.vue'
import QueueSfc from './elements/elv-queue.ce.vue'
import ScrubberSfc from './elements/elv-scrubber.ce.vue'
import SourceSfc from './elements/elv-source.ce.vue'
import SwitchSfc from './elements/elv-switch.ce.vue'
import TabsSfc from './elements/elv-tabs.ce.vue'
import TagSfc from './elements/elv-tag.ce.vue'
import TimerCardSfc from './elements/elv-timer-card.ce.vue'
import TraceEventsSfc from './elements/elv-trace-events.ce.vue'
import TransportSfc from './elements/elv-transport.ce.vue'

export { CONCEPTS } from './concepts'
export type { Concept } from './concepts'
export type { ConsoleLine } from './elements/elv-console.ce.vue'
export type { QueueRowItem } from './elements/elv-queue.ce.vue'
export type { TabItem } from './elements/elv-tabs.ce.vue'
export type { TransportControl } from './elements/elv-transport.ce.vue'

export const Admonition = defineCustomElement(AdmonitionSfc)
export const Button = defineCustomElement(ButtonSfc)
export const Console = defineCustomElement(ConsoleSfc)
export const Kbd = defineCustomElement(KbdSfc)
export const Pane = defineCustomElement(PaneSfc)
export const Queue = defineCustomElement(QueueSfc)
export const Source = defineCustomElement(SourceSfc)
export const Switch = defineCustomElement(SwitchSfc)
export const Tabs = defineCustomElement(TabsSfc)
export const Tag = defineCustomElement(TagSfc)
export const TimerCard = defineCustomElement(TimerCardSfc)
export const Transport = defineCustomElement(TransportSfc)
export const Caption = defineCustomElement(CaptionSfc)
export const HaltBanner = defineCustomElement(HaltBannerSfc)
export const Scrubber = defineCustomElement(ScrubberSfc)
export const TraceEvents = defineCustomElement(TraceEventsSfc)

/** Tag name → element class, in one place so the docs and `register()` agree. */
export const ELEMENTS = {
  'elv-admonition': Admonition,
  'elv-button': Button,
  'elv-console': Console,
  'elv-kbd': Kbd,
  'elv-pane': Pane,
  'elv-queue': Queue,
  'elv-source': Source,
  'elv-switch': Switch,
  'elv-tabs': Tabs,
  'elv-tag': Tag,
  'elv-timer-card': TimerCard,
  'elv-transport': Transport,
  'elv-caption': Caption,
  'elv-halt-banner': HaltBanner,
  'elv-scrubber': Scrubber,
  'elv-trace-events': TraceEvents,
} as const

export function register(): void {
  for (const [tag, element] of Object.entries(ELEMENTS)) {
    if (!customElements.get(tag)) customElements.define(tag, element)
  }
}

register()
