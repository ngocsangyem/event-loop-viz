import editor from './core-editor'
import playback from './core-playback'
import panels from './core-panels'

/** App shell strings. Each feature keeps its own message file so they can grow apart. */
export default {
  ...editor,
  ...playback,
  ...panels,
  app: {
    title: 'Event Loop Visualizer',
    tagline: 'Step through a simulated browser event loop',
  },
  header: {
    visualization: 'Visualization',
    panels: 'Panels',
    panelsView: 'Panels view',
    diagram: 'Diagram',
    diagramView: 'Diagram view',
    threeD: '3D',
    threeDView: '3D view',
    share: 'Share',
    shareCopied: 'Link copied to the clipboard',
    shareHint: 'Copy this link to share the Script',
    shareUrl: 'Share URL',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
  },
}
