/**
 * Drive me "under the hood" notes. Each restates a passage checked against its source (see
 * src/renderer/drive/drive-info.ts for the links); nothing here goes beyond what that source says.
 */
export default {
  callStack: { title: 'The call stack', body: 'Calling a function creates an execution context and pushes it on a stack; the one on top is the code running now. When the call returns it is removed, and the caller runs again.' },
  console: { title: 'console.log', body: 'The Console Standard leaves how output is printed to the browser. If the console is closed, browsers may keep the messages to show later.' },
  setTimeout: { title: 'setTimeout', body: 'setTimeout returns its id right away. Once the delay has passed, HTML queues a task on the timer task source to run the callback, so the delay is a minimum, not an exact time.' },
  timerClamp: { title: 'The 4 ms clamp', body: 'HTML: if the timer nesting level is greater than 5 and the delay is less than 4 ms, the delay becomes 4 ms.' },
  eventLoop: { title: 'The event loop', body: 'Each turn, the event loop takes the oldest task from one task queue; which queue is up to the browser. After the task it performs a microtask checkpoint.' },
  checkpoint: { title: 'Microtask checkpoint', body: 'A checkpoint keeps running microtasks while the microtask queue is not empty, so microtasks queued meanwhile run before the next task. One also runs right after a script, once the call stack is empty.' },
  promiseJobs: { title: 'then and the microtask queue', body: 'then on a settled promise queues its reaction job at once; on a pending promise the reaction is stored until the promise settles. HTML runs these jobs from the microtask queue.' },
  await: { title: 'await', body: 'An async function runs synchronously until an await, where control returns to its caller. Awaiting a native promise reuses that promise, so carrying on waits for a single reaction job.' },
  thenable: { title: 'Thenables', body: 'Resolving a promise with an object that has a then method queues an extra job, which calls that then.' },
  asyncGenerator: { title: 'Async generators', body: 'Calling an async generator function does not run its body; next() resumes it. In an async generator, yield awaits its value first.' },
  postMessage: { title: 'MessagePort.postMessage', body: 'postMessage on a port adds a task to the other port\'s port message queue. The onmessage handler runs in that task.' },
  unhandledRejection: { title: 'Unhandled rejections', body: 'Rejected promises with no handler are collected. At the end of the microtask checkpoint, HTML queues a task on the DOM manipulation task source to report them. A handler added before then means no report.' },
  busyLoop: { title: 'Busy loops delay timers', body: 'A timer callback cannot run until the code that called setTimeout has finished, so a long loop delays it. In this app, Date.now() reads the Virtual Clock.' },
}
