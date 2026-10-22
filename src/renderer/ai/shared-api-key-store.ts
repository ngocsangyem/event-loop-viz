import { createApiKeyStore } from './api-key-store'
import type { ApiKeyStore } from './api-key-store'

let shared: ApiKeyStore | null = null

/**
 * The one OpenRouter key store of the page, shared by Ask AI and Drive me, so a key entered in
 * either (even one not remembered on this device) works in both for this page load.
 */
export function sharedApiKeyStore(): ApiKeyStore {
  shared ??= createApiKeyStore()
  return shared
}
