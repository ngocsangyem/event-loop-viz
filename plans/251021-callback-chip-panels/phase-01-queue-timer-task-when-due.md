# Phase 1: queue a timer Task when it is due

## Context links
- Bug site: `src/host/timer-scheduler.ts:50-53` emits `task:queue` inside `init()`, which runs at `timer:init` time.
- Loop: `src/host/event-loop-host.ts:141-180` (`drainTasks`); the clock jump is at `:156`; the cause of a timer's `task:begin` is set at `:168` from `ctx.taskQueueSeq`.
- Clock advance per node: `src/host/engine-event-hooks.ts:35-40` (`onNode`).
- Emit and loc rules: `src/host/host-run-context.ts:34-43` (`HOST_ONLY_KINDS`), `:58-72` (`emit`), `:62` (`taskQueueSeq`).
- Port messages: `src/host/event-loop-host.ts:62-66`. The message is ready when posted, so `dueUs = now` follows the spec. **No change.**
- Reducer: `src/player/apply-event.ts:20-26` (task:queue), `:74-88` (timer:init/fire/clear).
- HTML timer initialization steps: the task is queued only after the timeout has elapsed.

## Overview
Priority P1 (bug). Status: completed. Today a timer shows in the Task Queue and in Web APIs at the same time, from `timer:init` until it fires. Probe: `setTimeout(() => console.log('a'), 10)` emits `task:queue {dueUs:10007}` at t=7us, event #8. After this phase, the Task joins the queue when the Virtual Clock reaches its due time, and the Web APIs entry leaves at that same moment.

## Key insights
- The Virtual Clock advances in two places only: `onNode` (+nodeCostUs) and the jump in `drainTasks`. Checking for due timers at both is enough to catch every due time.
- The choice of which Task runs next (`timers.next()`, `enqueuedBefore`) stays unchanged, so the order Tasks run in, the Observable Output and `test:oracle` cannot change.
- The display order in the Task Queue matches the run order. A swept timer is queued at the first clock tick at or after its due time, and a port message is queued at its post tick. The sweep runs at the start of a node, before any postMessage in that node. Same-tick ties keep the order timers were armed in.
- `clearTimeout` on a timer that is already queued: Chrome cancels the posted task. The host already deletes it from `timers`, so it never runs. The reducer must also remove it from `state.tasks`, which needs `tid` on the timer `task:queue` event.
- The swept `task:queue` happens in the middle of a node. It must carry no `loc`, because the current node is unrelated code such as the busy-wait loop. To keep the cause highlight on the `setTimeout` call (checked by `e2e/source-highlight.spec.ts`), both the swept `task:queue` and the timer's `task:begin` take `cause = seq of timer:init`.

### Trade-off: when to queue (decision: sweep on every clock advance)
| Option | Pro | Con |
|---|---|---|
| A. Queue lazily, just before `task:begin` | Small change | A busy-wait never shows the Task waiting. Two equal-delay timers enter the queue one at a time. Misleading. |
| **B. Sweep in `onNode` and at the loop jump** | Matches the spec and the video. A busy-wait shows the timer's Task queued while the long Task runs. | One O(1) check per node, plus events emitted in the middle of a node |
| C. Sweep only at Task end and at the jump | No per-node hook | Wrong when the clock passes the due time during a long Task |

Picked B. Per node, compare `clock.nowUs >= nextUnqueuedDueUs`, with the value cached and recomputed on init, clear and sweep.

A 0 ms timer is queued at the next clock advance after `setTimeout` returns. When it is the last statement of the Script, that advance is the loop jump, after the Script's Checkpoint. The rule is the same everywhere: "the first Virtual Clock advance at or after the due time".

## Requirements
- Functional: a timer stays in `state.timers` until it is due. It then moves to `state.tasks` with `tid`. `timer:clear` removes it from either place. An interval re-armed at `timer:fire` waits in Web APIs again.
- Non-functional: the Observable Output of every fixture is unchanged. Per-node overhead is O(1). Old v1 Traces still replay as before.

## Architecture / data flow
```
setTimeout -> timers.set -> emit timer:init (initSeq saved on PendingTimer); NO task:queue
onNode: clock += cost -> checkVirtualTime -> timers.queueDue(nowUs)
drainTasks: jump clock to nextDue -> timers.queueDue(nowUs) -> task:begin(cause=initSeq) -> timer:fire
queueDue: for each unqueued timer with dueUs <= now, sorted (dueUs, order):
  mark queued; emit task:queue {taskId, source:'timer', dueUs, tid} with no loc, cause=initSeq
Reducer: task:queue with tid -> remove timers[tid], push task {.., tid}
         timer:clear -> remove timers[tid] AND tasks where tid matches
```

## Related code files
Modify:
- `src/host/timer-scheduler.ts`: drop the emit at `:50-53`. Add `initSeq` and `queued` to `PendingTimer`. Add `queueDue(nowUs)` and keep the next unqueued due time cached. `rearm` goes through `init`, so it no longer queues.
- `src/host/engine-event-hooks.ts`: `createEngineHooks` takes an `onClockAdvance()` callback and calls it at the end of `onNode`.
- `src/host/event-loop-host.ts`: wire `onClockAdvance: () => timers.queueDue(clock.nowUs)`. After the jump at `:156`, call `timers.queueDue`. The cause of a timer's `task:begin` (`:168`) becomes `next.initSeq`.
- `src/trace/trace-event.ts`: `task:queue` gets `tid?: string`. `TRACE_SCHEMA_VERSION = 2`.
- `src/trace/trace-event-schema.ts`: `tid: opt(str)` on `task:queue`. Update the doc comment that says version 1.
- `tests/golden/trace-schema-v1.json` -> delete. Create `tests/golden/trace-schema-v2.json` (regenerate).
- `src/trace/__tests__/trace-schema.test.ts`: snapshot path, the "pinned for schemaVersion 2" assertion, and the comment.
- `src/host/event-loop-host.ts:79`: `TRACE_SCHEMA_VERSION as 1` -> `as 2` (or `typeof`).
- `src/player/replay-state.ts`: `QueuedTask.tid?: string`.
- `src/player/apply-event.ts`: task:queue with `tid` removes the matching pending timer. `timer:clear` also filters `tasks` by `tid`.
- `src/renderer/diagram/diagram-flow.ts:78-87`: a timer's `task:queue` plays `['timer-fires']` and lights `['taskq']` (new step key `timerDue`). A timer's `task:begin` plays `['next-task','run-task']`. Delete the stale comment.
- `src/i18n/messages/{en,vi}/diagram.ts`: add `step.timerDue`. Reword `step.runTimerTask` (it no longer starts at Web APIs).
- `src/player/explain-phrases-en.ts:67,89` and `src/player/explain-phrases-vi.ts:82,104`. task:queue for a timer: "Time is up for {timer}: its callback joins the Task Queue as Task X…". timer:fire: "The event loop picks {timer}'s Task; its callback runs now." The task:queue phrase needs the `name` param to name the timer.

Create: none. Delete: `tests/golden/trace-schema-v1.json`, replaced by the v2 file.

## Existing tests that break and why
| Test | Why | Fix |
|---|---|---|
| `src/runner/__tests__/run-script.test.ts:79-93` | The order changes: the 0 ms timer is queued after the Script's Checkpoint, at the jump | Expect `…task:end, checkpoint:begin, checkpoint:end, task:queue, task:begin, timer:fire…` |
| `src/runner/__tests__/run-script.test.ts:97-107` | `dueUs - t === 7000` no longer holds, because `t` is now ≥ dueUs | Assert `timer:init.t + 7000 === task:queue.dueUs` and `task:queue.t >= dueUs` |
| `src/renderer/diagram/__tests__/diagram-flow.test.ts:22-24, 30-33` | Timer task:queue edges are now `['timer-fires']`. Timer task:begin no longer has `timer-fires`. | Update the expectations and test names |
| `src/trace/__tests__/trace-schema.test.ts` | Version 2 and the new field | Regenerate with `UPDATE_GOLDEN=1`, rename the snapshot |
| `src/runner/__tests__/trace-schema-conformance.test.ts` | Validates header `schemaVersion` against the current version | Passes once the schema table has `tid` |
| `src/player/__tests__/explain-phrases.test.ts:46` | EN/VI parity check, if wording is compared | Keep both locales in step |

Expected to stay green (re-verify): `message-channel.test.ts:24` (port only), `rejection-tracking.test.ts:18`, `state-at.test.ts` and `hand-built-traces.ts` (v1 shape, no `tid`, so the old reducer path applies), `real-traces.test.ts` (v1 golden Traces replay unchanged), `e2e/scene-queues-timers.spec.ts:50-66` (only its comment goes stale; fix the comment), `e2e/diagram-view.spec.ts:56-57` (it waits until `timer-fires` is lit, which now happens at task:queue), `e2e/source-highlight.spec.ts` (cause preserved through initSeq), `pnpm run test:oracle`.

AI context (`src/renderer/ai/build-run-context.ts:86-91`): the "Task queue" and "Pending timers" lines are now correct: a timer is no longer listed in both. No code change. `build-run-context.test.ts:20` uses only the Script task, so it is unaffected.

## Implementation steps
1. In timer-scheduler: record `initSeq = ctx.events.length` before emitting `timer:init`. Remove the queue emit. Implement `queueDue(nowUs)`, which walks the timers sorted by `(dueUs, order)` and emits for each due, unqueued one. `next()` stays as it is.
2. Emit without a loc: inside `queueDue`, save `ctx.clock.loc`, set it to `undefined`, emit, then restore it. Add a comment explaining why: the host performs this step at a clock tick, not as part of the code being evaluated.
3. In engine-event-hooks, call `onClockAdvance()` after `checkVirtualTime`. A BudgetHalt throws first, so nothing is queued after a Halt.
4. In event-loop-host, call `queueDue` after the jump and before choosing `taskId` and the cause. Use `next.initSeq` as the cause of a timer's `task:begin`.
5. Schema: add `tid` and bump to v2. Regenerate the snapshot.
6. Reducer: handle `tid` on task:queue and on timer:clear. A v1 Trace has no `tid` on task:queue, so it keeps the old behaviour.
7. Diagram flow and i18n. Explain phrases in EN and VI.
8. Update the tests listed above. Add host tests (step 9).
9. New tests in `src/runner/__tests__/timer-queued-when-due.test.ts`:
   - (a) A 10 ms timer: the timer's `task:queue.t >= dueUs`, and it comes after the Script's `task:end`.
   - (b) The busy-wait fixture source: the timer's `task:queue` comes before the Script's `task:end`, and its `t` is less than the `t` of `console 'after busy wait'`.
   - (c) Two equal-delay timers are queued in arm order at the same `t`.
   - (d) `clearTimeout` after the timer was queued during a busy-wait: there is no `task:begin` for it, and in the replay `tasks` no longer has it after `timer:clear`.
   - (e) Each `setInterval` repeat is queued only when due.
   - (f) Observable Output equals what the run produced before the change, for these scripts.
10. Run `pnpm run type-check && pnpm exec vitest run && pnpm run test:oracle`.

## Todo list
- [x] timer-scheduler: initSeq, queueDue, no queue at init
- [x] engine-event-hooks onClockAdvance
- [x] event-loop-host: sweep after the jump, cause = initSeq
- [x] trace `tid` and schema v2 with the snapshot
- [x] reducer: timer to task move, clear removes the queued task
- [x] diagram flow, diagram i18n EN/VI
- [x] explain phrases EN/VI
- [x] fix the broken tests and add the new host tests
- [x] oracle green

## Success criteria
- Observable: at any position, no timer `tid` is in both `state.timers` and `state.tasks`. Checked by a unit test over every example script in `src/examples/example-library.ts`.
- busy-wait example: the Task Queue shows the timer Task while the Call Stack still shows the Script.
- `pnpm run test:oracle` passes with no new known failures.

## Risks
| Risk | L x I | Mitigation |
|---|---|---|
| The sweep emits during Halt unwinding | L x M | `emit` already returns once `meter.tripped` is set (`host-run-context.ts:60`) |
| Event-budget Halts shift by a few events | L x L | Same number of task:queue events, or fewer (cleared timers never queue). No fixture depends on the events budget. |
| Per-node cost | L x M | Compare against a cached number. `seek-performance.test.ts` guards replay, not host speed. Spot-check that the infinite-loop example runs in about the same time. |
| The cause highlight is lost | M x M | `initSeq` cause, plus the source-highlight e2e |

## Security
None: no new input surface.

## Next steps
Phase 2 adds `callback` and `taskId` to the same events, still within schema v2.

## Unresolved questions
- Should a 0 ms timer that is the last statement visibly enter the queue before the Script's Checkpoint, by sweeping at `task:end` as well? The current choice is no: one rule, "at a clock advance".
