# Event loop "under the hood": verified sources

**Method:** researcher subagent, 2026-10-22. It fetched the raw pages and string-checked every quote against the fetched text, after normalizing whitespace.

**Sources:** WHATWG HTML, ECMA-262, the WHATWG Console Standard, MDN, and v8.dev. Used by Drive me's info tooltips (`src/renderer/drive/drive-info.ts`).

| Topic | Fact | Quote (verbatim) | URL |
|---|---|---|---|
| Call stack | A call pushes an execution context, which becomes the running one. | "The newly created execution context is pushed onto the stack and becomes the running execution context." | https://tc39.es/ecma262/#sec-execution-contexts |
| Call stack | Returning pops it, and the caller runs again. | "Remove calleeContext from the execution context stack and restore callerContext as the running execution context." | https://tc39.es/ecma262/#sec-ecmascript-function-objects-call-thisargument-argumentslist |
| console.log | How output is printed is up to the browser; it may buffer while the console is closed. | "The printer operation is implementation-defined." / "If the console is not open when the printer operation is called, implementations should buffer" | https://console.spec.whatwg.org/#printer |
| setTimeout | Returns its id right away. | "Return id ." | https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps |
| setTimeout | After the delay, a task is queued on the timer task source. | "Let completionStep be an algorithm step which queues a global task on the timer task source given" | (same) |
| Clamp | Nesting level above 5 with a delay under 4 ms gives 4 ms. | "If nestingLevel is greater than 5, and timeout is less than 4, then" | (same) |
| Event loop | One task from one queue per turn; which queue is implementation-defined. | "Let taskQueue be one such task queue , chosen in an implementation-defined manner." | https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model |
| Event loop | Then a microtask checkpoint. | "Perform a microtask checkpoint ." | (same) |
| Checkpoint | Runs while the microtask queue is not empty. | "While the event loop 's microtask queue is not empty" | https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint |
| Checkpoint | Microtasks queued meanwhile run before the next task (MDN). | "those newly-added microtasks execute before the next task is run" | https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide |
| Checkpoint | Runs after a script once the stack is empty. | "If the JavaScript execution context stack is now empty, perform a microtask checkpoint." | https://html.spec.whatwg.org/multipage/webappapis.html#calling-scripts |
| then | Pending: the reaction is stored; settled: its job is queued. | "If promise . [[PromiseState]] is pending , then Append fulfillReaction to promise . [[PromiseFulfillReactions]] ." | https://tc39.es/ecma262/#sec-performpromisethen |
| then | HTML runs promise jobs from the microtask queue. | "HTML schedules these operations in the microtask queue." | https://html.spec.whatwg.org/multipage/webappapis.html#hostenqueuepromisejob |
| await | At an await, control returns to the caller. | "Return ? RunCallerContext ( empty )." | https://tc39.es/ecma262/#await |
| await | A native promise is reused (no wrapper). | "If SameValue ( resolutionCtor , ctor ) is true , return resolution ." | https://tc39.es/ecma262/#sec-promise-resolve |
| Thenable | Resolving with a thenable queues a job that calls then. | "Let job be NewPromiseResolveThenableJob ( promise , resolution , thenJobCallback )." | https://tc39.es/ecma262/#sec-promise-resolve-functions |
| Async generator | yield awaits its value first. | "If genKind is async , return ? AsyncGeneratorYield (? Await ( arg ))." | https://tc39.es/ecma262/#sec-yield |
| Async generator | next() resumes a suspended body. | "If state is either suspended-start or suspended-yield , then Perform AsyncGeneratorResume ( gen , completion )." | https://tc39.es/ecma262/#sec-asyncgenerator-prototype-next |
| MessagePort | postMessage adds a task to the target port's port message queue. | "Add a task that runs the following steps to the port message queue of targetPort" | https://html.spec.whatwg.org/multipage/web-messaging.html#message-ports |
| Rejections | Reported in a task on the DOM manipulation task source. | "Queue a global task on the DOM manipulation task source given global to run the following step" | https://html.spec.whatwg.org/multipage/webappapis.html#notify-about-rejected-promises |
| Rejections | A handler attached before the report removes it from the list. | "If global 's about-to-be-notified rejected promises list contains promise , then remove promise from that list and return ." | https://html.spec.whatwg.org/multipage/webappapis.html#the-hostpromiserejectiontracker-implementation |
| Busy loop | A timer callback waits for the code that called setTimeout to finish (MDN). | "the function or code snippet cannot be executed until the thread that called setTimeout() has terminated" | https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#late_timeouts |

## Gaps the researcher flagged
- **"Await takes 1 tick":** this is derived from PromiseResolve + PerformPromiseThen, not stated in any source. The tooltips say "a single reaction Job" and do not give a tick count.
- **Run-to-completion:** no primary sentence covers sync code (the ECMA-262 line covers Jobs only). No tooltip claims it.
- **Task source names:** "timer task source" and "posted message task source" are used in spec steps but are not in the spec's list of generic task sources. MessagePort uses the port message queue.
- **V8 blog:** v8.dev/blog/fast-async says "avoiding two microticks for await", with no ES year in the fetched text. Not cited in the tooltips.

## Unresolved questions
- Should the app keep "Tick" counts anywhere in learner text, given the spec does not state them? (The curated thenable note says "one more Tick". That is derived from the Trace's own Job order, which the replay shows.)
