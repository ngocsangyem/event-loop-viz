import { describe, expect, it } from 'vitest'
import { runHotkeyLabel } from '../run-hotkey-label'

describe('runHotkeyLabel', () => {
  it.each(['MacIntel', 'iPhone', 'iPad'])('prints ⌘↵ on %s', (platform) => {
    expect(runHotkeyLabel(platform)).toBe('⌘↵')
  })

  it.each(['Win32', 'Linux x86_64', ''])('prints Ctrl↵ on %j', (platform) => {
    expect(runHotkeyLabel(platform)).toBe('Ctrl↵')
  })
})
