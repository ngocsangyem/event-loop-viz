# Drive me walkthrough review: flow and accuracy

**Trigger:** user report. The walkthroughs lacked detail and skipped the moment a callback moves onto the call stack.

**Sources:**
- Simulator Traces of all 9 examples, dumped with a one-off script.
- `docs/research/event-loop-semantics.md` (Chrome 155, verified cases).
- `GLOSSARY.md`.

## Findings on the first version (57 steps)
| # | Problem | Where | Fix |
|---|---|---|---|
| 1 | **No call stack step at all.** Callbacks jumped from "queued" straight to "printed". The pushes are in the Trace as `frame:push`, but nothing showed them. | all 9 | One step per callback push. The step finds the callback frame with `{ k: 'frame:push', where: { label }, after: <job:begin / task:begin> }`. |
| 2 | **Timer: Web APIs → task queue was skipped.** With the Virtual Clock, a 0 ms timer's Task is queued *during* the Script (e.g. seq 12 in sync-promise-async-timeout), and that is where the user sees the callback move. | timers in 4 examples | A `task:queue` step: "the timer is due: its callback becomes a Task; it still waits". |
| 3 | **Event loop taking the next Task was missing** for most Tasks. | message-channel, unhandled-rejection, busy-wait, timers | A `task:begin` step before each Task's callback push. |
| 4 | **The message vs timer order was presented as a rule.** Research §4.12: the spec leaves the choice between task sources to the browser, and Chrome follows the order they were queued. This is an observed behavior. | message-channel | "The spec lets the browser pick between task sources. Chrome takes them in the order they were queued." |
| 5 | **Clamp wording was imprecise** ("more than five nested timers"). Research §4.9: HTML clamps when the nesting level is above 5; in Chrome the 7th chained timer is the first one clamped. The Trace agrees: `timer:init` #8 has nesting 7 and is clamped to 4 ms, and #7 is not. | timers-and-clamp | "The 7th timer in the chain: 0 ms becomes 4 ms … once the nesting level passes 5". |
| 6 | **Wrong reason for the order** ("because that Task was queued first"). The real reason is that the 50 ms timer is not due yet. | unhandled-rejection | "The report runs before the timer: the timer is not due until 50 ms." |
| 7 | **The step "Promise.reject has no handler" stood on `task:begin`,** an unrelated event. | unhandled-rejection | It now stands on `promise:settle` `{state: 'rejected'}` at line 2. |

## What changed
- **Matcher:** `EventMatcher` gained `where` (field equality) and `after` (count from a named event). Both are covered by `resolve-drive-steps.test.ts`.
- **Shape of every walkthrough:**
  1. The Script goes on the call stack.
  2. For each callback: scheduled (Web APIs / microtask queue) → due (task queue) → taken (Checkpoint / Task) → **pushed on the call stack** → output.
  3. The last output, or the Halt.
- **Step counts:** 57 → 90.

  | Example | Steps |
  |---|---|
  | await-vs-then | 11 |
  | sync-promise-async-timeout | 16 |
  | timers-and-clamp | 10 |
  | thenables | 10 |
  | async-generators | 12 |
  | message-channel | 9 |
  | unhandled-rejection | 10 |
  | busy-wait | 9 |
  | infinite-loop | 3 |
- **Check against the simulator:** every step resolved, with positions strictly increasing in every example.
- **Writing rule:** a claim is either (a) visible in the step's own Trace event, or (b) a rule verified in the research doc (§4.1–4.12). No spec section numbers in the learner text. No claims about other frames on the stack: the engine also shows `script` frames around callbacks.

## AI steps (custom Scripts)
- **Prompt:** follow every callback through scheduled → taken → `frame:push` on the call stack → output. 6–16 steps.
- **New no-guessing rule:** give a reason for an order only when the Trace shows it, or it follows from the core rule. Never cite spec or browser internals that are not in the context; describe the event and leave out *why*.
- **Parser cap:** raised from 12 to 16.

## Not verified
- vitest / type-check: not run, per the user's instruction.
- The AI path: never run against a real model.

## Unresolved questions
1. A 16-step walkthrough (sync-promise-async-timeout) is long. Should Drive me offer a "short" mode that skips the call stack steps?

## Second pass (same day): every call, not only callbacks
**User report:** after `console.log('start')` the walkthrough jumped straight to setTimeout. It never said that the log goes on the call stack, prints, and leaves.

**Root cause:** the steps were written by hand per example, so any call the author did not think of was missing.

**Fix: steps are now built from the Trace** (`renderer/drive/narrate-trace.ts`).
- **Every move the learner can see is a step:**
  - the Script going on the call stack;
  - every function the Script calls, including built-ins the Script calls by name (`console.log()`, `setTimeout()`, `Promise.resolve()`, `.then()`, `.next()`, `postMessage()`, `Date.now()`…);
  - what each call prints, schedules or queues;
  - each Checkpoint;
  - each Job or Task taken, and its callback going on the call stack;
  - awaits and resumes;
  - how the Run ends.
- **Left out:** engine-internal frames (Promise constructor, executor, species, message dispatch), pops, and bookkeeping events.
- **Loops:** a loop calling a built-in more than 3 times back to back becomes one step with the count read from the Trace (busy-wait: `Date.now()` × 2499). A short `.then().then()` chain stays as separate steps.
- **No fabrication:** the words come from generic templates (`drive.narration`) filled only with values from the event: line, printed text, ms, Task/Job number. Each template sentence holds for every Script that can produce that step.
- **Curated layer:** per-example "why" notes (`examples/drive-steps/*.ts`) stand on narrated steps. A test fails if a note lands off a step.
- **Under the hood:** an ⓘ popover on the first step of each mechanism. The text restates passages verified in `researcher-2026-10-22-event-loop-under-the-hood-sources.md`, with a source link.

**Fixed during this pass:**
- **The rejection report is queued at the *end* of the Checkpoint, not "after" it.** Trace: `task:queue` seq 64 comes before `checkpoint:end` seq 65. Spec: notify about rejected promises is part of the checkpoint steps.
- **Esc on an open ⓘ popover also ended Drive me.** Now Esc closes the popover only.

**Step counts:**

| Example | Steps |
|---|---|
| sync-promise-async-timeout | 31 |
| await-vs-then | 23 |
| thenables | 29 |
| async-generators | 24 |
| message-channel | 21 |
| unhandled-rejection | 26 |
| busy-wait | 23 |
| timers-and-clamp | 76 |
| infinite-loop | 4 |

**Checks:**
- Rendered the en and vi text of every example with the real simulator and read it through.
- In the browser: step 2/31 lights the Call Stack panel showing `console.log`; the ⓘ link opens console.spec.whatwg.org/#printer; Esc closes ⓘ while Drive me stays on.
- vitest and type-check were not run.

**Open:** custom Scripts still go to the AI (the user's decision). The narration now works for any Script without a key; the AI could be limited to adding "why" notes.
