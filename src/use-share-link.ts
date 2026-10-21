import { readonly, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { encodeShareFragment } from '@/share/share-link-codec'
import type { SharedSettings } from '@/share/share-link-codec'

/**
 * Share links carry the Script and its Run settings in the URL fragment. `share` writes the
 * link to the address bar and tries the clipboard; `copied` says whether that worked, since
 * the clipboard can be denied.
 */
export function useShareLink(script: Readonly<Ref<string>>, settings: Readonly<Ref<SharedSettings>>) {
  const url = shallowRef<string | null>(null)
  const copied = shallowRef(false)

  async function share() {
    const next = new URL(window.location.href)
    next.hash = encodeShareFragment({ script: script.value, settings: settings.value })
    url.value = next.href
    history.replaceState(null, '', next)
    copied.value = false
    try {
      await navigator.clipboard.writeText(next.href)
      copied.value = true
    } catch {
      // Clipboard may be denied; the URL stays visible and in the address bar.
    }
  }

  return { url: readonly(url), copied: readonly(copied), share }
}
