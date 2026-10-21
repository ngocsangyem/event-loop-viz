import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import { createApiKeyStore } from '../api-key-store'
import AskAiSettingsDialog from '../ask-ai-settings-dialog.vue'

/** An in-memory stand-in for localStorage, so the tests see what would be persisted. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

let wrapper: ReturnType<typeof mount> | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

async function open(storage = memoryStorage()) {
  const store = createApiKeyStore(storage)
  wrapper = mount(AskAiSettingsDialog, {
    attachTo: document.body,
    global: { plugins: [i18n] },
    props: {
      open: true,
      model: 'acme/one',
      store,
      models: [],
      modelStatus: 'error',
      keyRejected: false,
    },
  })
  await flushPromises()
  return { store, storage }
}

const q = <T extends Element>(selector: string) => document.body.querySelector<T>(selector)
const type = async (value: string) => {
  const input = q<HTMLInputElement>('[data-testid="ask-ai-key"]')!
  input.value = value
  input.dispatchEvent(new Event('input'))
  await flushPromises()
}
const click = async (testId: string) => {
  q<HTMLElement>(`[data-testid="${testId}"]`)!.click()
  await flushPromises()
}

describe('AskAiSettingsDialog draft', () => {
  it('keeps the key out of the store until SAVE', async () => {
    const { store, storage } = await open()
    await type('sk-or-test')
    expect(store.key.value).toBe('')
    expect(storage.data.size).toBe(0)
    await click('ask-ai-done')
    expect(store.key.value).toBe('sk-or-test')
    expect(wrapper!.emitted('saved')).toHaveLength(1)
    expect(wrapper!.emitted('update:open')?.slice(-1)[0]).toEqual([false])
  })

  it('disables SAVE until a key is typed', async () => {
    await open()
    expect(q<HTMLButtonElement>('[data-testid="ask-ai-done"]')!.disabled).toBe(true)
    await type('sk-or-test')
    expect(q<HTMLButtonElement>('[data-testid="ask-ai-done"]')!.disabled).toBe(false)
  })

  it('CANCEL discards the draft', async () => {
    const { store } = await open()
    await type('sk-or-test')
    await click('ask-ai-cancel')
    expect(store.key.value).toBe('')
    expect(wrapper!.emitted('saved')).toBeUndefined()
    expect(wrapper!.emitted('update:open')?.slice(-1)[0]).toEqual([false])
  })

  it('REMOVE KEY clears the stored key at once', async () => {
    const { store, storage } = await open(memoryStorage({ 'elv-openrouter-key': 'sk-or-old' }))
    expect(q<HTMLInputElement>('[data-testid="ask-ai-key"]')!.value).toBe('sk-or-old')
    await click('ask-ai-forget')
    expect(store.key.value).toBe('')
    expect(storage.data.has('elv-openrouter-key')).toBe(false)
    expect(q<HTMLInputElement>('[data-testid="ask-ai-key"]')!.value).toBe('')
  })

  it('masks the key until SHOW is pressed', async () => {
    await open()
    expect(q<HTMLInputElement>('[data-testid="ask-ai-key"]')!.type).toBe('password')
    q<HTMLButtonElement>('[data-slot="text-field-box"] button')!.click()
    await flushPromises()
    expect(q<HTMLInputElement>('[data-testid="ask-ai-key"]')!.type).toBe('text')
  })

  it('shows the rejected-key error only while the draft equals the rejected key', async () => {
    const store = createApiKeyStore(memoryStorage({ 'elv-openrouter-key': 'sk-or-bad' }))
    wrapper = mount(AskAiSettingsDialog, {
      attachTo: document.body,
      global: { plugins: [i18n] },
      props: { open: true, model: 'm', store, models: [], modelStatus: 'error', keyRejected: true },
    })
    await flushPromises()
    expect(document.body.textContent).toContain('401 — key rejected')
    await type('sk-or-new')
    expect(document.body.textContent).not.toContain('401 — key rejected')
  })
})
