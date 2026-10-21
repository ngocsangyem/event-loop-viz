import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { useColorTheme } from '../use-color-theme'

function stubOsDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: dark, media: query }))
}

function mount() {
  const scope = effectScope()
  const theme = scope.run(() => useColorTheme())!
  return { theme, scope }
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  delete document.documentElement.dataset.theme
  stubOsDark(false)
})
afterEach(() => vi.unstubAllGlobals())

describe('useColorTheme', () => {
  it('is dark on a first visit, whatever the OS says', () => {
    const { theme, scope } = mount()
    expect(theme.choice.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    scope.stop()
  })

  it('restores a stored light choice', () => {
    localStorage.setItem('elv-theme', 'light')
    const { theme, scope } = mount()
    expect(theme.choice.value).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    scope.stop()
  })

  it('migrates a stored "system" to the OS value once, and rewrites it', () => {
    stubOsDark(true)
    localStorage.setItem('elv-theme', 'system')
    const { theme, scope } = mount()
    expect(theme.choice.value).toBe('dark')
    expect(localStorage.getItem('elv-theme')).toBe('dark')
    scope.stop()

    localStorage.setItem('elv-theme', 'system')
    stubOsDark(false)
    const second = mount()
    expect(second.theme.choice.value).toBe('light')
    expect(localStorage.getItem('elv-theme')).toBe('light')
    second.scope.stop()
  })

  it('toggle flips the theme, the root attribute and the stored value', async () => {
    const { theme, scope } = mount()
    theme.toggle()
    await nextTick()
    expect(theme.choice.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('elv-theme')).toBe('light')
    scope.stop()
  })

  it('survives unreadable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { theme, scope } = mount()
    expect(theme.choice.value).toBe('dark')
    scope.stop()
    vi.restoreAllMocks()
  })
})
