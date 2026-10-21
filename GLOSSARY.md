# Event Loop Visualizer

Runs a user-supplied script under a simulated browser event loop and replays exactly what happened, step by step, matching current Chrome.

## Execution

**Script**:
The JavaScript source the user pastes in, run as a classic script.
_Avoid_: program, snippet, code (when the user's input is meant)

**Run**:
One execution of a Script from start to halt, producing exactly one Trace.
_Avoid_: session, execution

**Host Profile**:
A named, versioned set of host-defined ordering rules that pins behavior to one browser release (e.g. `chrome-155`).
_Avoid_: browser mode, target

**Virtual Clock**:
The simulated time a Run advances; it never reads real time.
_Avoid_: timer clock, fake time

**Halt**:
The end of a Run, either natural (no work left) or forced because a Budget ran out.
_Avoid_: timeout, crash

**Budget**:
A deterministic limit on a Run, counted in steps, tasks, virtual time, or trace length, never in wall-clock time.
_Avoid_: timeout, quota

**Unsupported API**:
A global the Script may reference that v1 deliberately refuses to simulate; touching it fails loudly instead of approximating.
_Avoid_: missing API, polyfill

## Event loop

**Task**:
A unit of work the event loop takes from a task queue (script, timer callback, …). A timer's Task is queued only once the Virtual Clock reaches its due time.
_Avoid_: macrotask

**Job**:
A unit of work in the microtask queue (promise reaction, resolve-thenable job, or `queueMicrotask` callback).
_Avoid_: microtask (as a noun for the item), callback

**Callback chip**:
The code of the function a Task or Job will call, shown as one token that moves between panels; identified by its Task or Job id.
_Avoid_: token, pill

**Checkpoint**:
One microtask checkpoint: draining the microtask queue until it is empty.
_Avoid_: flush, microtask phase

**Tick**:
One FIFO round of the microtask queue; a Job enqueued during round r runs in round r+1.
_Avoid_: turn, cycle, loop iteration

## Replay

**Trace**:
The immutable, ordered record of everything that happened in one Run, plus a header identifying schema, engine, and Host Profile.
_Avoid_: log, recording, history

**Trace Event**:
One entry in a Trace, tied to a spec step.
_Avoid_: step, action, log line

**Visible Event**:
A Trace Event shown by default during replay; bookkeeping events are folded into the next Visible Event.
_Avoid_: major event, key frame

**Observable Output**:
What a Script reveals to the outside world: console lines, reported exceptions, and unhandled-rejection reports, in order.
_Avoid_: result, output (alone)

**Oracle**:
Real Chrome, at the Host Profile's pinned major version, whose Observable Output defines correctness.
_Avoid_: reference, ground truth (alone)

**Scene**:
The anatomy illustration of the event loop at one position in the Trace, fully determined by that position.
_Avoid_: canvas, animation

**Diagram**:
The architecture-style view of the event loop: cards joined by connectors, where a signal travels the connectors the current Trace Event uses. Its cards are fully determined by the position; only the signal depends on the step that led there.
_Avoid_: Scene, flowchart

**Timing-sensitive Run**:
A Run whose ordering depends on how long code takes to execute, so it may diverge from the Oracle.
_Avoid_: flaky run, racy script

**Bookkeeping Event**:
A Trace Event that is hidden by default and folded into the next Visible Event, e.g. an unobserved promise creation or a built-in frame that calls no user code.
_Avoid_: internal event, noise

## Differential testing

**Fixture**:
A Script kept in the differential corpus, named after the one concept it pins (e.g. `await-thenable`).
_Avoid_: sample, example, test case

**Golden**:
The Oracle's recorded Observable Output for one Fixture, against which every Run of that Fixture is compared.
_Avoid_: snapshot, expected output, baseline

**Skipped Fixture**:
A Fixture with no comparable Golden, either declared out of scope or found to be non-deterministic in the Oracle, always with a stated reason.
_Avoid_: disabled test, flaky test
