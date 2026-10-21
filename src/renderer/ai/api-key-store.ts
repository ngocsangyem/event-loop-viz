import { shallowRef } from 'vue'

export const KEY_STORAGE_NAME = 'elv-openrouter-key'
export const MODEL_STORAGE_NAME = 'elv-openrouter-model'

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function browserStorage(): KeyValueStorage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

/**
 * The learner's OpenRouter key. It lives in memory; only when "remember" is on is it also
 * written to this browser's localStorage. Nothing here sends it anywhere.
 */
export function createApiKeyStore(storage: KeyValueStorage | null = browserStorage()) {
  function read(): string {
    try {
      return storage?.getItem(KEY_STORAGE_NAME) ?? ''
    } catch {
      return ''
    }
  }

  function write(action: (s: KeyValueStorage) => void) {
    try {
      if (storage) action(storage)
    } catch {
      // Blocked storage: the key then stays in memory for this page load.
    }
  }

  const stored = read()
  const key = shallowRef(stored)
  const remember = shallowRef(stored !== '')

  function persist() {
    if (remember.value && key.value !== '') write((s) => s.setItem(KEY_STORAGE_NAME, key.value))
    else write((s) => s.removeItem(KEY_STORAGE_NAME))
  }

  return {
    key,
    remember,
    setKey(value: string) {
      key.value = value.trim()
      persist()
    },
    setRemember(value: boolean) {
      remember.value = value
      persist()
    },
    /** Clears the key from memory and from storage. */
    forget() {
      key.value = ''
      remember.value = false
      write((s) => s.removeItem(KEY_STORAGE_NAME))
    },
  }
}

export type ApiKeyStore = ReturnType<typeof createApiKeyStore>

/** The chosen model id, remembered per browser. It is not a secret. */
export function readStoredModel(storage: KeyValueStorage | null = browserStorage()): string {
  try {
    return storage?.getItem(MODEL_STORAGE_NAME) ?? ''
  } catch {
    return ''
  }
}

export function writeStoredModel(id: string, storage: KeyValueStorage | null = browserStorage()) {
  try {
    storage?.setItem(MODEL_STORAGE_NAME, id)
  } catch {
    // Not remembering the model is harmless.
  }
}
