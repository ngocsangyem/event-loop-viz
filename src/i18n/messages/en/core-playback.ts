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
    autostart: 'Autostart',
    autostartHint: 'Start playing as soon as a Run finishes',
    /** Printed on the controls; each word is part of the control's full name above. */
    word: {
      start: 'Start',
      task: 'Task',
      tick: 'Tick',
      prev: 'Prev',
      next: 'Next',
      end: 'End',
    },
  },
  /** The caption above the stage: what this step is and what it changed. */
  caption: {
    region: 'Current step',
    step: 'Step {step} / {total}',
    tick: 'Tick {tick}',
    line: 'Line {line}',
    clock: 'Virtual Clock {clock}',
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
  },
  /** The right column of the replay: why this step happened, then every Trace Event. */
  rail: {
    region: 'Why this step',
    why: 'Why',
    traceEvent: 'Trace Event {seq}',
    events: 'Trace Events',
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
