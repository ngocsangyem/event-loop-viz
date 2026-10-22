// Shared cue sheet: the one place where picture and sound agree on what happens on which beat.
// Imported by the film (browser) and by the score (node), so it must stay dependency-free.
// Beat indices refer to the measured grid in beats.json (128 BPM, 32 beats = 15 s).

export const BPM = 128
export const BEATS = 32
export const DURATION = 15

// Section boundaries in beats: [start, end). Every boundary is a hard cut.
export const SECTIONS = {
  hook: [0, 4], // setTimeout(fn, 0) vs Promise.then: who runs first?
  loop: [4, 8], // dive through the 0, it becomes the square loop
  run: [8, 18], // the Script runs through stack, queues and console
  reorder: [18, 24], // source order rearranges into run order
  rule: [24, 28], // sync, then every microtask, then one task
  logo: [28, 32], // lock-up
}

// The sample Script, in source order. `lands` is the concept lane it is routed to.
export const SCRIPT = [
  { code: "console.log('start')", lands: 'console', out: 'start' },
  { code: "setTimeout(() => log('timeout'), 0)", lands: 'task', out: 'timeout' },
  { code: "promise.then(() => log('promise'))", lands: 'job', out: 'promise' },
  { code: "console.log('end')", lands: 'console', out: 'end' },
]

// Run-section events, one per beat. Visuals and SFX both key off `kind`.
export const RUN_EVENTS = [
  { beat: 8, kind: 'push', line: 0, label: "log('start')" },
  { beat: 9, kind: 'enqueue-task', line: 1, label: 'TASK #2' },
  { beat: 10, kind: 'enqueue-job', line: 2, label: 'JOB #1' },
  { beat: 11, kind: 'push', line: 3, label: "log('end')" },
  { beat: 12, kind: 'script-done' },
  { beat: 13, kind: 'job-to-stack' },
  { beat: 14, kind: 'log', out: 'promise' },
  { beat: 15, kind: 'tick' },
  { beat: 16, kind: 'task-to-stack' },
  { beat: 17, kind: 'log', out: 'timeout' },
]

// Run order of the Script's lines (indices into SCRIPT): sync first, then the Job, then the Task.
export const RUN_ORDER = [0, 3, 2, 1]

// Concept hues from docs/design/tokens.css (dark theme). Orange is spent only on "now".
export const HUE = {
  bg: '#141413',
  raised: '#1a1a18',
  panel: '#1e1d1b',
  ink: '#faf9f5',
  ink2: '#b0aea5',
  ink3: '#87867f',
  ink4: '#5e5d59',
  line: '#faf9f529',
  now: '#d97757',
  stack: '#e5c07b',
  job: '#c792ea',
  task: '#82aaff',
  console: '#c3e88d',
  timer: '#89ddff',
}
