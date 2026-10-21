/** The queue panels, the Event Loop panel and the Console. */
export default {
  panels: {
    about: 'About {title}',
    running: 'running',
    /** Focal state of a pane the current step changed, and of an entry that just arrived. */
    changed: 'Changed',
    runningState: 'Running',
    newItem: 'NEW',
    /** Phone: opens or folds a pane the step left alone. */
    show: 'Show',
    hide: 'Hide',
    due: 'due {due}',
    callStack: {
      title: 'Call Stack',
      info: 'Frames of the code running now, top first. The event loop picks the next Task only when the stack is empty. Built-ins called by other built-ins are hidden.',
      empty: 'Empty',
    },
    eventLoop: {
      title: 'Event Loop',
      info: 'Each turn runs the oldest Task to completion, then drains the microtask queue, then waits for the next Task.',
      phase: 'Phase',
      clock: 'Clock',
      tick: 'Tick',
      task: 'Task',
      microtasks: 'Microtasks',
      idle: 'Waiting for the next Task',
      running: 'Running a Task',
      draining: 'Draining microtasks',
      halted: 'Run finished',
    },
    microtaskQueue: {
      title: 'Microtask Queue',
      info: 'Promise reactions, thenable resolution and queueMicrotask callbacks. It drains completely after every Task, before the next Task starts.',
      empty: 'No microtasks queued',
    },
    taskQueue: {
      title: 'Task Queue',
      info: 'Macrotasks: the Script itself, timer callbacks and MessagePort messages. The event loop runs one Task, then drains the microtask queue.',
      empty: 'No tasks queued',
    },
    webApis: {
      title: 'Web APIs',
      info: 'Timers the browser is counting down. When one is due, its callback moves to the Task Queue.',
      empty: 'No pending timers',
      callback: 'callback',
      delay: 'delay',
      browser: 'Browser',
      left: '{left} left',
      clamped: 'raised from {requested}ms',
      repeats: 'repeats',
      more: '+{count} more',
    },
    taskSource: { script: 'Script', timer: 'Timer', 'port-message': 'MessagePort', 'dom-manipulation': 'DOM' },
    chip: { label: '{kind}: {code}', awaitResume: '{fn} after await', line: 'line {line}', anonymous: '(anonymous)' },
    jobKind: { reaction: 'Promise reaction', thenable: 'Resolve thenable', microtask: 'queueMicrotask' },
  },
  console: {
    title: 'Console',
    info: 'Observable Output so far: console lines, uncaught exceptions and unhandled rejections.',
    empty: 'No console output at this step.',
  },
}
