export { default as NavTabs } from './NavTabs.vue'

export interface NavTabItem {
  key: string
  label: string
  /** Printed `[k]` before the label; decorative, hidden below sm. */
  hotkey?: string
  disabled?: boolean
}
