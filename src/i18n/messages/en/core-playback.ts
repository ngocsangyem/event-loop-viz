/** Transport bar, timeline scrubber, event list and the event detail pane. */
export default {
  transport: {
    region: 'Playback',
    start: 'Go to start',
    backTask: 'Back one Task',
    backTick: 'Back one Tick',
    prev: 'Prev',
    next: 'Next',
    forwardTick: 'Forward one Tick',
    forwardTask: 'Forward one Task',
    end: 'Go to end',
    play: 'Play',
    pause: 'Pause',
    speed: 'Speed',
    autostart: 'Auto-play',
    autostartHint: 'Start playing as soon as a Run finishes',
    /** The dock word that holds the speed and Auto-play. */
    options: 'Playback',
    optionsTitle: 'Playback settings',
    /** Printed on the controls; each word is part of the control's full name above. */
    word: {
      start: 'Start',
      task: 'Task',
      tick: 'Tick',
      prev: 'Step',
      next: 'Step',
      end: 'End',
    },
  },
  /** The caption above the stage: what this step is and what it changed. */
  caption: {
    region: 'Current step',
    step: 'Step {step} / {total}',
    tick: 'Tick {tick}',
    line: 'Line {line}',
    ready: 'Ready · example loaded',
    readyText: 'Press Run to record a Trace.',
    running: 'Recording Trace…',
    phases: 'Event loop phase',
    task: 'Task',
    taskId: 'Task {id}',
    checkpoint: 'Microtask Checkpoint',
    jobsQueued: '{count} queued',
    next: 'Next: {what}',
    nothingNext: 'Next: idle',
    halt: 'Halt · {reason}',
  },
  /** The pinned dock under the stage. */
  dock: {
    region: 'Playback dock',
    clock: 'Virtual Clock',
    lastEvent: 'What just happened',
    noTrace: 'No Trace yet — press Run',
    keys: 'Keys',
  },
  /** The right column of the replay: why this step happened, then every Trace Event. */
  rail: {
    region: 'Why this step',
    why: 'Why',
    traceEvent: 'Trace Event {seq}',
    events: 'Trace Events',
  },
  /** The two banners between the header and the grid. */
  banner: {
    halt: 'Halt · {name} Budget',
    raiseBudget: 'Raise Budget',
    raiseBudgetHint: 'Go back to the Script and raise the Budget in Run settings',
    timing: 'Timing-sensitive',
  },
  /** Phone only: the Script and the replay are two tabs. */
  modeTabs: {
    label: 'Mode',
    script: 'Script',
    replay: 'Replay',
  },
  scrubber: {
    timeline: 'Timeline',
    step: 'Step {step} of {total}',
    marker: '{family} at event {seq}',
  },
  eventList: {
    region: 'Events',
    filter: 'Filter by family',
    showAll: 'Show all events',
    /** `Task #2 — Timer`: the Task whose turn the following rows belong to. */
    group: 'Task {id} — {source}',
    source: {
      script: 'Script',
      timer: 'Timer',
      'port-message': 'Message',
      'dom-manipulation': 'DOM',
      'posted-message': 'postMessage',
      networking: 'Network',
      'javascript-engine': 'JS engine',
      'animation-frame': 'rAF',
    },
  },
  detail: {
    region: 'Event detail',
    bookkeeping: '(bookkeeping)',
    specStep: 'Spec step',
    payload: 'Payload',
    source: 'Source',
    cause: 'Cause',
    sourceLine: 'line {line}, column {column}',
    noSource: 'no source location',
    noCause: 'none (started by the host)',
  },
}
