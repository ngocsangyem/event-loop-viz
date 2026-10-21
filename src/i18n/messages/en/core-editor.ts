/** Editor card: the Script, Run, examples, settings and the notices about a Run. */
export default {
  editor: {
    region: 'Code editor',
    title: 'Script',
    script: 'Script',
    editing: 'Editing',
    locked: 'Locked while running',
    sourceTitle: 'Source',
    readOnlyTag: 'Read-only',
    run: 'Run',
    cancel: 'Cancel',
    running: 'Running',
    runningText: 'Running…',
    recording: 'Recording Trace…',
    budget: 'Budget {tasks} Tasks · {events} events · {seconds} s',
    editLabel: 'Edit',
    edit: 'Edit (discards Trace)',
  },
  source: {
    legend: 'Queued work this line created',
    run: 'Run',
    runNumber: 'Run #{n}',
    endedNaturally: 'Ended naturally',
    halted: 'Halted · Budget',
    events: '{n} Trace Event | {n} Trace Events',
    ticks: '{n} Tick | {n} Ticks',
    stats: '{events} · {ticks} · {from} → {to} ms',
  },
  syntax: {
    title: 'SyntaxError',
    goToLine: 'Go to line {line}',
  },
  examples: {
    button: 'Example',
    custom: 'Custom',
    menuLabel: 'Load an example Script',
    items: {
      awaitVsThen: {
        title: 'await vs then',
        description: 'An awaited promise resumes before a chained then does its second step.',
      },
      timersAndClamp: {
        title: 'Timers and clamp',
        description: 'Chained 0 ms timers get clamped to 4 ms once nesting gets deep.',
      },
      thenables: {
        title: 'Thenables',
        description: 'Awaiting an object with a then method costs extra microtask ticks.',
      },
      asyncGenerators: {
        title: 'Async generators',
        description: 'yield inside an async generator awaits its operand before resolving next().',
      },
      messageChannelVsTimeout: {
        title: 'MessageChannel vs setTimeout',
        description: 'A posted message is its own task source and races a 0 ms timer.',
      },
      unhandledRejection: {
        title: 'Unhandled rejection',
        description: 'The rejection is reported after the microtask checkpoint, before a later timer.',
      },
      busyWait: {
        title: 'Busy-wait',
        description: 'A blocking loop advances the clock and delays a timer that was already due.',
      },
      infiniteLoop: {
        title: 'Infinite loop',
        description: 'A runaway loop is stopped by the execution budget instead of freezing the tab.',
      },
    },
  },
  settings: {
    button: 'Run settings',
    hint: 'Changed values apply to the next Run and are saved in the Trace and in share links.',
    field: {
      nodes: 'Node Budget',
      tasks: 'Task Budget',
      virtualMs: 'Virtual time Budget (ms)',
      events: 'Event Budget',
      nodeCostUs: 'Cost per node (µs)',
    },
  },
  supportedApis: {
    button: 'Supported APIs',
    title: 'Supported in the Chrome 155 model',
    group: { timer: 'Timer · Web APIs', job: 'Job · Promises', console: 'Log · Console' },
    footer: 'Anything else is an Unsupported API and blocks the Run before it starts.',
    promises: 'Promise, async/await, generators, async generators, for await',
    timers: 'setTimeout, setInterval, clearTimeout, clearInterval',
    microtask: 'queueMicrotask',
    messageChannel: 'MessageChannel',
    console: 'console.log / info / warn / error',
    clock: 'Date.now() and performance.now() (Virtual Clock)',
    random: 'Math.random (seeded per Run)',
  },
  unsupported: {
    title: 'Unsupported API · Run blocked',
    line: 'Line {line}',
  },
  timing: {
    badge: 'Timing-sensitive: ordering depends on compute time and may differ in your browser.',
    hint: "A timer was due within 2 ms of a compute stretch ending, so Chrome's real timing could order this Run differently.",
  },
  halt: {
    withLimit: 'Halted: the {name} Budget ({limit} {unit}) was exceeded.',
    noLimit: 'Halted: the {name} Budget was exceeded.',
    name: { nodes: 'node', tasks: 'Task', 'virtual-time': 'virtual time', events: 'event' },
    unit: { nodes: 'nodes', tasks: 'Tasks', 'virtual-time': 'ms', events: 'events' },
  },
}
