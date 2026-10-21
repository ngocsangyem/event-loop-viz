import { ref, watch } from 'vue'

/** Which visualization shows the Trace: flat labelled panels, or the isometric 3D Scene. */
export type VisualizerView = 'panels' | '3d'

const STORAGE_KEY = 'elv-view'

/** The chosen view, remembered per browser. Panels is the default. */
export function useVisualizerView() {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked; the default view is fine.
  }
  const view = ref<VisualizerView>(stored === '3d' ? '3d' : 'panels')
  watch(view, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Not remembering the view is harmless.
    }
  })
  return view
}
