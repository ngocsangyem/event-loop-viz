/** Editor card: the Script, Run, examples, settings and the notices about a Run. */
export default {
  editor: {
    region: 'Code editor',
    code: 'Code',
    script: 'Script',
    run: 'Run',
    cancel: 'Cancel',
    running: 'Running',
    runningText: 'Running…',
    readOnly: 'Read-only during replay.',
    edit: 'Edit (discards Trace)',
  },
  examples: {
    button: 'Examples',
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
    button: 'Advanced settings',
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
    promises: 'Promise, async/await, generators, async generators, for await',
    timers: 'setTimeout, setInterval, clearTimeout, clearInterval',
    microtask: 'queueMicrotask',
    messageChannel: 'MessageChannel',
    console: 'console.log / info / warn / error',
    clock: 'Date.now() and performance.now() (Virtual Clock)',
    random: 'Math.random (seeded per Run)',
  },
  unsupported: {
    title: 'Unsupported APIs referenced',
    touching: '— touching one throws UnsupportedApiError.',
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
