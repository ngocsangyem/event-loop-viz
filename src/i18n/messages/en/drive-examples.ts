/**
 * The "why" notes of the built-in examples' Drive me walkthroughs, by example (camelCase id) and
 * note key. Each one is visible in the Run's Trace or verified in docs/research/event-loop-semantics.md.
 */
export default {
  awaitVsThen: {
    awaitFirst: 'f awaits a promise that is already fulfilled, so its Job is queued at once, before the then callbacks further down.',
    secondThen: 'The second then is called now, but its promise (made by the first then) is still pending, so nothing is queued for it yet.',
    then2Late: 'then2 joins the queue only now, after then1 ran. A Job queued during a Checkpoint still runs in that same Checkpoint.',
  },
  syncPromiseAsyncTimeout: {
    timerWaits: 'Even at 0 ms the callback cannot run now: it needs a Task of its own, and the Script Task is still running.',
    asyncOrder: 'That is why async that printed before end, while async end will print after it.',
    jobsFirst: 'The timer Task was queued before these Jobs, but every Job runs before the event loop takes another Task.',
    promiseBeforeAwait: 'The then callback was queued before the await, so promise 1 prints before async end.',
    finalOrder: 'Final order: start, async that, end, promise 1, async end, timeout 1.',
  },
  timersAndClamp: {
    chainGrows: 'Each timer set from inside a timer callback is one nesting level deeper than the Task that set it.',
    seventh: 'In Chrome the 7th timer of such a chain is the first one raised to 4 ms.',
    t3Between: 't3 was due at 3 ms. The 4 ms delay puts the next step after it, so t3 runs between s6 and s7.',
  },
  thenables: {
    twoTicks: 'Awaiting a thenable costs one more Tick than awaiting a native promise: one Job calls then, another resumes the function.',
    between: 'So await thenable prints between tick 1 and tick 2.',
  },
  asyncGenerators: {
    onlyCreates: 'Calling g() only creates the generator object. Its body does not run yet: g:start has not printed.',
    yieldAwaits: 'In an async generator, yield first awaits its operand, here Promise.resolve(\'v\').',
    neverAfter: 'g stops at the yield. g:after-yield never runs: nothing calls next() again.',
  },
  messageChannelVsTimeout: {
    twoSources: 'Two Tasks from two task sources are now waiting: the timer and the message.',
    chromeOrder: 'The spec lets the browser choose between task sources. Chrome takes them in the order they were queued, so the timer goes first.',
  },
  unhandledRejection: {
    notYet: 'Nothing handles this rejection. The browser does not report it until the end of the next microtask Checkpoint.',
    stillTime: 'A handler added during these Jobs would still catch the rejection in time.',
    reportTask: 'This Task will report the unhandled rejection. HTML queues it at the end of the Checkpoint, once the microtask queue is empty.',
    beforeTimer: 'It is reported before the timer because the timer is not due until 50 ms.',
  },
  busyWait: {
    clockMoves: 'Date.now() reads the Virtual Clock, which moves forward as the Script runs. The loop spins until 20 ms have passed.',
    stillJobsFirst: 'The timer was due long ago, but Jobs still run first.',
    late: 'It was due at 0 ms and starts about 20 ms late.',
  },
  infiniteLoop: {
    neverReturns: 'while (true) never gives the call stack back, so no Task or Job could ever run. A real tab would freeze; here the node Budget stops the Run.',
  },
}
