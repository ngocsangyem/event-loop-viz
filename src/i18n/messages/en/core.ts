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
    tagline: 'Chrome 155 model',
  },
  header: {
    visualization: 'Visualization',
    panels: 'Panels',
    panelsView: 'Panels view',
    diagram: 'Diagram',
    diagramView: 'Diagram view',
    threeD: '3D Scene',
    threeDView: '3D view',
    share: 'Share',
    shareCopied: 'Link copied to the clipboard',
    shareHint: 'Copy this link to share the Script',
    shareUrl: 'Share URL',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    languageSwitch: 'Switch language to {name}',
    edit: 'Edit',
    replay: 'Replay',
    replayRun: 'Replay · Run #{n}',
    keys: 'Keys',
    keysHint: 'Print hotkeys next to controls',
  },
  /** The words of every ON/OFF switch. */
  switch: {
    on: 'On',
    off: 'Off',
  },
  /** The `?` sheet: DESIGN.md keyboard map. */
  /** The `[V]TRACE` word in the dock that shows the Why rail and its Trace Events. */
  tracePanel: { open: 'Trace', close: 'Hide Trace' },
  shortcuts: {
    title: 'Keyboard shortcuts',
    hint: 'Keys never fire while you type in the editor or a field.',
    play: 'Play / pause',
    step: 'Step back / forward',
    tick: 'Previous / next Tick',
    task: 'Previous / next Task',
    ends: 'First step / last step or Halt',
    tour: 'Previous / next tour stop',
    ask: 'Open / close Ask AI',
    mode: 'Edit Script / back to Replay',
    run: 'Run the Script',
    esc: 'Cancel Run · close panel or dialog',
    views: 'Panels · Diagram · 3D Scene',
    prefs: 'Language · theme · share link',
    sheet: 'This sheet',
    trace: 'Show / hide the Trace panel',
  },
}
