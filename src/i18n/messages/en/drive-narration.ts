/**
 * Words of the walkthrough steps built from a Trace (renderer/drive/narrate-trace.ts), by step
 * kind and variant. Each sentence must hold for every Script that produces that step, so it only
 * says what the step's own event shows. Values in braces come from the event.
 */
export default {
  anonymous: 'the anonymous function',
  callbackOnLine: 'the callback on line {line}',
  callback: 'the callback',
  restOf: 'the rest of {name}',
  scriptStart: {
    title: 'The Script goes on the call stack',
    body: 'The event loop runs the Script as its first Task. While it runs it sits on the call stack, and nothing else can run until it finishes.',
  },
  call: {
    title: '{Name}() goes on the call stack',
    body: 'Line {line} calls {name}, so a new frame goes on top of the call stack.',
    anonymous: { title: 'The function on line {line} is called', body: 'A new frame for it goes on top of the call stack.' },
  },
  builtinCall: {
    title: '{Name} goes on the call stack',
    body: 'Line {line} calls the built-in {name}. A built-in goes on the call stack like any other function and leaves it when it returns.',
    repeated: {
      title: '{Name} runs {count} times',
      body: 'Line {line} calls {name} again and again in a loop: {count} calls back to back, each one on the call stack and off again. Nothing else can run meanwhile.',
    },
  },
  console: {
    title: 'It prints {text}',
    body: 'The text goes to the console. Then the call returns and leaves the call stack.',
  },
  timer: {
    title: 'A {ms} ms timer starts in Web APIs',
    body: 'setTimeout hands {callback} to a timer and returns at once. The callback waits there until the timer is due.',
    clamped: {
      title: 'This timer asks for {requested} ms but gets {ms} ms',
      body: 'It is set from deep inside a chain of timer callbacks (nesting level {nesting}), so HTML raises its delay to {ms} ms. The callback waits in Web APIs.',
    },
    repeat: {
      title: 'A {ms} ms repeating timer starts in Web APIs',
      body: 'setInterval hands {callback} to a timer that comes due every {ms} ms.',
    },
  },
  webApi: {
    requestAnimationFrame: {
      title: 'A requestAnimationFrame callback waits for the next frame',
      body: 'requestAnimationFrame hands {callback} to the browser and returns an id at once. It runs at the next rendering opportunity, after the Tasks that are already due.',
    },
    fetch: {
      title: 'fetch sends a request: {detail}',
      body: 'fetch returns a pending promise at once. The request runs outside the event loop; when the response arrives, a networking Task settles the promise.',
    },
    body: {
      title: 'The response body is read: {detail}',
      body: 'Reading a body is asynchronous too: it settles in a networking Task, not in the current one.',
    },
    import: {
      title: 'import() starts loading {detail}',
      body: 'import() returns a pending promise at once. The module loads in a networking Task, which evaluates it and then settles the promise.',
    },
    waitAsync: {
      title: 'Atomics.waitAsync waits on {detail}',
      body: 'The promise it returned settles in a Task of its own once Atomics.notify wakes it.',
    },
  },
  frame: {
    title: 'A rendering opportunity: {count} animation frame callback(s)',
    body: 'The browser renders a frame about every 16.7 ms. Before painting it runs the requestAnimationFrame callbacks that were waiting, all with the timestamp {ms} ms.',
  },
  taskQueued: {
    timer: {
      title: 'The timer is due: Task #{task} is queued',
      body: '{Callback} joins the task queue. It still waits until the call stack is empty and the event loop takes it.',
    },
    portMessage: {
      title: 'The message is queued as Task #{task}',
      body: 'postMessage queued a Task for the onmessage handler, {callback}. It waits in the task queue.',
    },
    domManipulation: {
      title: 'Task #{task} is queued',
      body: 'The browser queues a Task of its own, on the DOM manipulation task source. It waits in the task queue.',
    },
    postedMessage: {
      title: 'The window message is queued as Task #{task}',
      body: 'window.postMessage queued a Task on the posted message task source. When it runs, every message listener is called, with a microtask checkpoint after each one.',
    },
    networking: {
      title: 'The network queues Task #{task}',
      body: 'A fetch response, a body read or an import() load is done, so a Task on the networking task source joins the task queue. The promise settles when that Task runs.',
    },
    javascriptEngine: {
      title: 'The engine queues Task #{task}',
      body: 'A FinalizationRegistry cleanup or an Atomics.waitAsync wake-up runs as a Task of its own. It waits in the task queue.',
    },
    animationFrame: {
      title: 'Rendering: Task #{task} is a requestAnimationFrame callback',
      body: 'A rendering opportunity came. Each waiting requestAnimationFrame callback runs now, one by one, with a microtask checkpoint after each.',
    },
    other: { title: 'Task #{task} is queued', body: 'It waits in the task queue.' },
  },
  jobQueued: {
    function: {
      title: '{Callback} is queued as Job #{job}',
      body: 'Its promise is settled, so the reaction goes into the microtask queue right away. It waits there until the call stack is empty.',
    },
    reject: {
      title: '{Callback} is queued as Job #{job}',
      body: 'Its promise is rejected, so this rejection handler goes into the microtask queue.',
    },
    await: {
      title: '{Callback} is queued as Job #{job}',
      body: 'The awaited value is ready, so carrying on after the await becomes a Job in the microtask queue.',
    },
    thenable: {
      title: 'Job #{job} is queued to call a then method',
      body: 'The value has a then method of its own, so a Job will call it before anything waiting on that value can go on.',
    },
    microtask: { title: '{Callback} is queued as Job #{job}', body: 'queueMicrotask puts it straight into the microtask queue.' },
    builtin: { title: 'Job #{job} is queued', body: 'A built-in promise step waits in the microtask queue.' },
  },
  await: {
    title: 'await pauses {name}',
    body: '{Name} leaves the call stack at line {line}, and its caller goes on. It continues later, in a Job.',
  },
  rejected: { title: 'The promise is rejected', body: 'Line {line} rejects a promise.' },
  scriptEnd: {
    title: 'The Script reaches its end',
    body: 'It leaves the call stack. The Script Task is done and the call stack is empty.',
  },
  checkpoint: {
    title: 'Microtask Checkpoint: Jobs waiting: {jobs}',
    body: 'With the call stack empty, the Jobs run one at a time, oldest first, until the microtask queue is empty. A Job queued meanwhile runs in this Checkpoint too.',
    empty: { title: 'Microtask Checkpoint: no Jobs', body: 'The microtask queue is empty, so the Checkpoint ends at once.' },
  },
  checkpointEnd: {
    title: 'The microtask queue is empty',
    body: 'Jobs run in this Checkpoint: {jobs}. Now the event loop can take the next Task.',
  },
  taskStart: {
    timer: { title: 'The event loop takes Task #{task}: a timer callback', body: 'The call stack and the microtask queue are empty, so the event loop takes the next Task from the task queue.' },
    portMessage: { title: 'The event loop takes Task #{task}: a message', body: 'The call stack and the microtask queue are empty, so the event loop takes the next Task from the task queue.' },
    domManipulation: { title: 'The event loop takes Task #{task}: a browser Task', body: 'The call stack and the microtask queue are empty, so the event loop takes the next Task from the task queue.' },
    postedMessage: { title: 'The event loop takes Task #{task}: a window message', body: 'The call stack and the microtask queue are empty, so the event loop takes the next Task from the task queue.' },
    networking: { title: 'The event loop takes Task #{task}: a network Task', body: 'The call stack and the microtask queue are empty, so the event loop takes the next Task from the task queue.' },
    javascriptEngine: { title: 'The event loop takes Task #{task}: an engine Task', body: 'The call stack and the microtask queue are empty, so the event loop takes the next Task from the task queue.' },
    animationFrame: { title: 'Task #{task} runs: a requestAnimationFrame callback', body: 'The rendering step calls the callbacks that were waiting for this frame, one at a time.' },
    other: { title: 'The event loop takes Task #{task}', body: 'The call stack and the microtask queue are empty, so the event loop takes the next Task from the task queue.' },
  },
  callbackStart: {
    job: { title: 'Job #{id} runs {callback}', body: 'The Job leaves the microtask queue and its callback goes on the call stack.' },
    task: { title: 'Task #{id} runs {callback}', body: 'The callback goes on the call stack.' },
  },
  builtinJob: { title: 'Job #{job} runs a built-in step', body: 'The Job leaves the microtask queue. It runs engine code only, nothing from the Script.' },
  resume: { title: '{Name} continues after await', body: 'Its Job puts it back on the call stack, right where it paused.' },
  genResume: { title: 'next() resumes {name}', body: 'The generator body goes on the call stack and runs from where it was: the start, the first time.' },
  genYield: { title: 'yield hands over its value', body: 'The generator pauses at the yield, and the promise from next() is settled with the value.' },
  rejectionReport: {
    unhandled: { title: 'Uncaught (in promise) {message}', body: 'The rejected promise still has no handler, so the browser reports it in the console.' },
    handled: { title: 'A late handler is reported', body: 'A handler was added after the rejection was reported, so the browser reports that it is handled now.' },
  },
  exception: { title: 'Uncaught {message}', body: 'No code on the call stack caught this exception. The browser reports it and goes on with the next Task or Job.' },
  halt: {
    natural: { title: 'The Run ends', body: 'No Task, Job or timer is left, so nothing more can run.' },
    budget: { title: 'Halt: the {reason} Budget is exceeded', body: 'The Run is stopped here, at {limit}, so the tab never freezes.' },
  },
}
