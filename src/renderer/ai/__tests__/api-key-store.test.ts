import { describe, expect, it } from 'vitest'
import { KEY_STORAGE_NAME, createApiKeyStore } from '../api-key-store'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const writes: string[] = []
  return {
    data,
    writes,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      writes.push(k)
      data.set(k, v)
    },
    removeItem: (k: string) => void data.delete(k),
  }
}

describe('createApiKeyStore', () => {
  it('keeps the key in memory only while "remember" is off', () => {
    const storage = fakeStorage()
    const store = createApiKeyStore(storage)
    store.setKey('  sk-or-test  ')
    expect(store.key.value).toBe('sk-or-test')
    expect(storage.writes).toEqual([])
    expect(storage.data.size).toBe(0)
  })

  it('saves the key when "remember" is on and removes it when turned off', () => {
    const storage = fakeStorage()
    const store = createApiKeyStore(storage)
    store.setKey('sk-or-test')
    store.setRemember(true)
    expect(storage.data.get(KEY_STORAGE_NAME)).toBe('sk-or-test')
    store.setKey('sk-or-other')
    expect(storage.data.get(KEY_STORAGE_NAME)).toBe('sk-or-other')
    store.setRemember(false)
    expect(storage.data.has(KEY_STORAGE_NAME)).toBe(false)
    expect(store.key.value).toBe('sk-or-other')
  })

  it('starts remembered when a key is already stored', () => {
    const store = createApiKeyStore(fakeStorage({ [KEY_STORAGE_NAME]: 'sk-or-saved' }))
    expect(store.key.value).toBe('sk-or-saved')
    expect(store.remember.value).toBe(true)
  })

  it('forget clears memory and storage', () => {
    const storage = fakeStorage({ [KEY_STORAGE_NAME]: 'sk-or-saved' })
    const store = createApiKeyStore(storage)
    store.forget()
    expect(store.key.value).toBe('')
    expect(store.remember.value).toBe(false)
    expect(storage.data.size).toBe(0)
  })

  it('works without usable storage', () => {
    const store = createApiKeyStore(null)
    store.setRemember(true)
    store.setKey('k')
    expect(store.key.value).toBe('k')
  })
})
