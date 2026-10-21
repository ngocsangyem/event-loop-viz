import { useStoredChoice } from './use-stored-choice'

/**
 * Which visualization shows the Trace: flat labelled panels, the animated architecture-style
 * diagram, or the isometric 3D Scene.
 */
export type VisualizerView = 'panels' | 'diagram' | '3d'

/** The chosen view, remembered per browser. Panels is the default. */
export function useVisualizerView() {
  return useStoredChoice<VisualizerView>('elv-view', ['panels', 'diagram', '3d'], 'panels')
}
