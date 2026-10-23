# "JavaScript Visualized – Event Loop" video: study and spec

Source: Lydia Hallie, *JavaScript Visualized - Event Loop, Web APIs, (Micro)task Queue*,
https://www.youtube.com/watch?v=eiC58R16hb8. Length 12:34, 1280×720.

Method: 54 frames sampled across the whole video, plus 0.5 s bursts at six transitions
(1:00, 4:12, 5:02, 7:15, 9:24, 10:05), plus the English captions.

Part A describes what the video does. Part B is the spec for reusing it in `motion/lessons/film/`.
Timestamps are `mm:ss` in the source video.

---

## Part A: Observations

### A1. Narrative arc (12.5 min)

| Time | Beat | What is on screen |
|---|---|---|
| 00:00 | Hook | Full runtime diagram on the left, a big "Event Loop" title on the right, presenter cam large. |
| 00:08 | "It's just one small piece" | The diagram zooms into a "JAVASCRIPT RUNTIME" frame. She mentions the heap, then drops it on purpose ("to keep my slides simple"). |
| 00:38 | Call Stack | Every panel except Call Stack is dimmed (spotlight). |
| 00:45–01:20 | Sync walkthrough | Code on the left, console below it, runtime on the right. Uses `logThree` / `logThreeAndFour`: nested frames push and pop. |
| 01:23 | The problem | A `longRunningTask` with a 1e9 loop blocks `importantTask`. This shows why single-threaded execution needs a way out. |
| 01:46 | Web API examples | A collage of real APIs: fetch, showOpenFilePicker, geolocation, setTimeout, indexedDB. |
| 02:01–02:16 | Web APIs | Spotlight on the Web APIs panel. Zoom into a grid of API families, each with a title, a one-line description and a chip per API. Then zoom out to a "BROWSER ENVIRONMENT" frame: Rendering Engines, Network Service (an animated SYN/ACK diagram), GPU, Sensors, File System, Camera… A bidirectional arrow connects Web APIs to the browser. |
| 02:38 | Generic model | A single `asyncTask(cb)` line. The Web API card holds `asyncTask` and a **callback** slot; an arrow points out to a "Browser feature" box with a spinner. |
| 02:46 | Taxonomy | "CALLBACKS, FOR EXAMPLE" and "PROMISES, FOR EXAMPLE" code cards. |
| 02:53–04:24 | Callback API, end to end | Geolocation. The call registers successCallback and errorCallback in labelled slots. The stack empties. A real-world illustration (a laptop in a room) shows the permission popup, with "EMPTY!" on the stack. The callback goes to the **Task Queue**. The Event Loop moves it to the stack. |
| 04:09–04:24 | Task Queue | The Task Queue lights up, and a list of task sources appears beside it: `setTimeout`, `setInterval`, `xhr.onload`, `addEventListener`, each callback outlined in pink with a "Task" tag. |
| 04:39–05:47 | setTimeout(2000) vs setTimeout(100) | The Web API card shows **callback + delay** sub-slots and a "→" handoff tab. The 100 ms callback reaches the queue first. The code panel dims once the script is done. A last frame stresses that the delay is the minimum time to the **queue**, not to execution. |
| 06:09–07:10 | Microtask Queue | A list of microtask sources: `.then/.catch/.finally`, "Function body execution following **await**", `queueMicrotask`, `MutationObserver`. Then both queues are shown full, to state the priority rule. |
| 07:10–08:10 | fetch + .then | The Web API card shows the promise internals: `[[PromiseState]] "pending"`, `[[PromiseResult]] undefined`, `[[PromiseFulfillReactions]]`. `.then` adds a **PromiseReaction** card. A Network box shows `GET /posts`. On resolve, the reaction becomes a microtask. |
| 08:10 | Pitfall | Infinite `queueMicrotask` recursion and `fetchWithRetry`: microtasks keep refilling and the Task cards stay greyed (starvation). |
| 08:40 | Practical tip | Promisify `getCurrentPosition` and use it with async/await and try/catch. |
| 09:03 | Quiz | "What gets logged?" on a static code card. Then the answer `5 1 3 4 2` in large type. |
| 09:18–10:51 | Quiz walkthrough | A full replay on the runtime layout, explaining why each line lands where it does. |
| 10:51–12:04 | Recap | Zoom back through Runtime, Browser, Task Queue, Microtask Queue and both queues full. Narration only, no new animation. |
| 12:04 | Outro | Back to the hook layout. |

**Teaching pattern:**

- Each concept is introduced the same way: problem → abstraction → concrete API → walkthrough → rule.
- She always shows a **source list** (who feeds this queue) before using the queue.
- The quiz comes **before** the explanation. The answer is revealed first and then justified.

### A2. Visual system

- **Canvas:** near-black (#000) background, dark slate panels (#1e2128-ish), all flat. There is no texture and no hand-drawn style.
- **Panels:** rounded rectangles (radius ≈ 10 px at 720p) with a **thick (≈ 4 px) gradient border**. Each concept has its own hue:

  | Panel | Border |
  |---|---|
  | Call Stack | red → orange |
  | Web APIs | magenta → violet (strongest glow) |
  | Task Queue | hot pink |
  | Microtask Queue | green → mint |
  | Event Loop | a narrow dark column (no coloured border) with a teal/cyan two-arrow cycle icon in the middle |

- **Title chips:** a grey rounded pill centred on the top border, straddling it, in white UI sans.
- **Code:** monospace on a dark card with macOS traffic-light dots and a gutter with line numbers.
  - Syntax colours: keyword pink, function green, string yellow, number purple, parameter orange.
  - The active line has a **full-width teal-green highlight bar** plus a brighter left edge marker. Multi-line statements get one block covering every line of the statement.
- **Console:** a separate card titled "console". Logs appear in the console hue (yellow strings, purple numbers), one per line.
- **Stack frames:** wide dark cells holding the call expression (`logThree()`, `console.log("Three!")`). They are bottom-anchored and stack upward, with the newest on top.
- **Queue items:** small dark cards with the callback source (`() => console.log(2)`). In the taxonomy slides they get a coloured outline (pink = Task, green = Microtask) and a tiny tag chip ("Task" / "Microtask") on the top edge.
- **Web API cards:** a nested dashed container.
  - Header chip: the API name in green, e.g. `setTimeout`, `fetch`, `getCurrentPosition`.
  - Labelled sub-slots: `callback`, `delay`, `successCallback`, `errorCallback`, `[[PromiseState]]`…
  - A **purple handoff tab with "→"** sticks out of the right edge of the Web APIs panel while the browser is working (`⇄` when data comes back).
- **Empty state:** an "EMPTY!" chip inside the empty Call Stack, in letter-spaced uppercase with a dashed border.
- **Presenter cam:** a picture-in-picture tile in the bottom-right corner on every frame; it grows large in the hook and the outro.

### A3. Motion grammar (from the 0.5 s bursts)

1. **Spotlight dimming.**
   - Unfocused panels drop to ≈ 20–25 % opacity, including their borders and contents. The focused panel keeps full saturation.
   - Used for every concept intro (00:38, 02:01, 04:09, 06:25) and to hide unused panels inside a walkthrough. For example, the Microtask Queue stays dim through the setTimeout demo.
2. **Frame push.** The new frame appears in its slot at about 30 % opacity and solidifies over ≈ 0.5 s (fade-in in place, no long flight). Seen at 1:00 (`console.log("Three!")`) and 9:24 (`Promise.resolve()`, `then()`).
3. **Frame pop.** It fades out in place. Frames below it do not move.
4. **Code-line sync.**
   - The highlight bar jumps to the next statement **at the same moment** the matching frame appears. There is no tween between lines.
   - Inside a called function, the highlight is on the callee's line while the call site stays implied.
5. **Web API registration.** The API card fades in inside the Web APIs panel and its slots fill (callback text, delay number). Then the "→" handoff tab slides out on the right.
6. **Timer completion.** The callback card in the Web API **tilts or wobbles slightly** (≈ 2–3°, seen at 10:05), then the card vanishes and the same callback appears in the Task Queue.
7. **Queue → stack, through the loop.**
   - The microtask card **lifts out of its queue**, travels left past the Event Loop column at loop height, and then up into the Call Stack (10:05–10:08).
   - The path shows that the event loop is what moves the work.
   - The card keeps its look during the flight. In the stack it becomes the callback frame, and the inner `console.log(1)` frame pushes on top of it.
8. **Script end.**
   - The **whole code panel dims** (≈ 25 %) when the script finishes, so "sync phase over" is visible at a glance (05:09, 10:03).
   - The code stays dim while callbacks run, because the callbacks are not "the script".
9. **Console write.** A new line appears (no typewriter) at the same moment the `console.log` frame is on the stack.
10. **Camera moves.**
    - Slow zoom in and out between levels: hook → runtime → Web APIs grid → browser environment.
    - Panels are re-laid out between scenes rather than animated piece by piece. For example, the runtime moves left to make room for a code card or an illustration.
11. **Reveal of lists.** Source lists (task sources, microtask sources) fade in row by row beside the spotlit queue.
12. **Pacing.** States hold 2–6 s while she talks. Visual changes happen exactly on the spoken verb ("pushed", "registered", "moved"). The animation is sparse; most frames are static.

### A4. Model accuracy (what our app must not copy)

| Video says or shows | Reality / our engine | Our stance |
|---|---|---|
| The whole script is not shown as a task. The quiz starts with the stack empty. | The script itself is a task. | Keep our "Script (global)" task frame. |
| The Event Loop is an icon; it never shows the drain loop. | The loop checks microtasks after every task. | Keep our ring with phases, but adopt the "move through the loop" path. |
| A Promise object lives "inside" the `fetch` Web API card. | The promise is a JS heap object; only the network work is host-side. | Show promise internals in a separate promise inspector, not inside Web APIs. |
| "Callback Queue" / "Task Queue" | The HTML spec has several task queues (timers, I/O, UI…). | Keep the single "Task Queue" label but tag the source (timer, event…). |
| `setTimeout` delay = minimum time to the queue | Correct. | Adopt the rule card. |
| The microtask list includes MutationObserver. | Correct. | Not in our engine scope. Mention only if an example uses it. |
| `Promise.resolve().then` → microtask queued at `then` time | Correct (the promise is already fulfilled). | Already matches the `thenables` lesson. |

---

## Part B: Spec for our lesson films

Goal: bring the video's clarity devices into `motion/lessons/film/` without dropping our design tokens,
the hand-drawn layer or the render contract (pure `seek(t)`, seeded noise, no timers).

### B1. Spotlight focus (high priority)

- **What:** every step's `focus` panel stays at full opacity; the other *used* panels drop to 35 % (we keep more than the video's 20 % because our panels hold state the learner should still read). Hidden panels stay hidden.
- **Timing:** ease-in-out over 0.4 s at beat start.
- **Where:** `panel-frame.ts` (`runtimeDim` exists; extend it to a per-panel focus weight), driven by `beat.focus`.
- **Done when:** a contact sheet shows exactly one bright panel per step beat, and overview beats light the panels one by one.

### B2. Queue → stack path through the event loop (high)

- **What:** when the loop picks a task or job, the card flies on a 3-point path: queue slot → loop ring (it passes the current phase marker) → stack top. The current flight goes straight from slot to stack.
- **Timing:** 0.9 s total, with a 0.15 s pause at the ring.
- **Where:** `item-layer.ts` (arc flights). Reuse `loopGeometry()` for the waypoint.
- **Done when:** in every `job:begin` and `task:begin`, the card's path visibly crosses the ring.

### B3. Script-done dimming of the code panel (high)

- **What:** on `task:end` of the script task, the code panel drops to 30 % except for the lines of the callback that is currently running, which get the active highlight at full opacity.
- **Where:** `code-panel.ts`, using `LessonSnapshot.line` and the picked task id.
- **Done when:** after the script ends, only callback lines are bright.

### B4. Web API cards with labelled slots (medium)

- **What:** each Web API card shows its API name chip, a `callback` slot with the callback source, and a typed slot:
  - `delay` (number) for timers;
  - `url` for fetch;
  - `event` for listeners.
- **Handoff tab:** while the host works, a small tab with "→" in `--webapi` hue sticks out of the panel edge.
- **Timer completion:** before the callback leaves, the card wobbles ±2° for 0.3 s (seeded, deterministic).
- **Where:** `panel-extras.ts` + `item-slots.ts`. Data comes from `webApiCardsOf`.
- **Done when:** the setTimeout lessons show the delay value, and the card leaves on the timer-fire move.

### B5. "Who feeds this queue" source lists (medium)

- **What:** in the Runtime Overview scene, when a queue is introduced, a side list fades in row by row.
  - Task: `setTimeout`, `setInterval`, events, I/O.
  - Microtask: `.then/.catch/.finally`, code after `await`, `queueMicrotask`.
- **Tags:** each row carries a tag chip in the queue's concept colour (`--task` / `--job`). Only list the sources this example's lesson relevantly needs, plus at most two others.
- **Where:** a new `source-list-view.ts`. Content goes in `LessonContent.overview[].sources?` (bilingual).
- **Done when:** the plan check fails if a listed source has no i18n string.

### B6. Empty-stack callout (low)

- **What:** when the stack becomes empty at a step that the narration marks as relevant ("only now does the loop get its turn"), an "EMPTY" chip appears inside the stack, in our hand-drawn style.
- **Where:** `panel-extras.ts`, triggered by `stack.length === 0` on the beat's snapshot.

### B7. Promise inspector (low, needs content)

- **What:** an optional card that shows `[[PromiseState]]`, `[[PromiseResult]]` and the reactions list for one promise the lesson names.
  - Reactions are added as `.then` runs.
  - On resolve, a reaction turns into a microtask card that flies to the Microtask Queue.
  - It is rendered **outside** the Web APIs panel (see A4).
- **Where:** it needs promise state in the Trace. Check what engine262 Trace v3 exposes before building it.

### B8. Quiz-first intro variant (low)

- **What:** the intro can show a "What gets logged?" title and reveal the answer only in Recap. This already matches our "question without the answer" rule, so the only change is the title style. Optionally, after the question, show "n. ?" blanks that fill in during Execute.

### Not adopting

- **Presenter cam:** we have no presenter.
- **Real-world illustrations** (laptop room) and the **browser-environment zoom:** out of scope, and too costly per lesson.
- **Promise inside Web APIs:** inaccurate (A4).
- **Flat no-texture look:** our identity is hand-drawn × modern on `docs/design/tokens.css`. Keep our hues:

  | Concept | Token | Video's colour |
  |---|---|---|
  | Stack | `--stack` yellow | red/orange |
  | Web APIs | `--webapi` cyan | magenta |
  | Task Queue | `--task` blue | pink |
  | Microtask Queue | `--job` magenta | green |

  Borrow the *idea* of a thicker gradient border on the focused panel only.

### Acceptance (all items)

- The render contract holds: no transitions or timers, and every new motion is a function of `FrameInfo`.
- Re-render one pilot lesson (`sync-promise-async-timeout`, vi + en). The contact sheet scores 8+ on readability and motion variety (AGENTS.md loop).
- `check-lesson-plan` stays green, and Whisper sync QA reports 0 problems.
- No change to narration timing: the new motions fit inside the existing move windows from `lay-out-beats.mjs`.

## Unresolved questions

- Does Trace v3 carry promise state and reaction lists? B7 depends on it.
- Should we re-render all 36 videos after B1–B3 (≈ 3 h render and about 600 MB of new LFS objects), or only new lessons?
- Should the Event Loop panel keep the phase ring, or switch to the video's simpler cycle icon on narrow layouts?
