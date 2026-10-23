# Design — Event Loop Visualizer (warm terminal)

The visualizer follows the claude.dev "warm terminal" system (measured 2026-10-10).
Its values are used verbatim; app-specific decisions are listed under **Deviations**.
Canonical token source: [`tokens.css`](./tokens.css). Full rationale and contrast
tables: [`design-system-guideline.md`](./design-system-guideline.md).

## Intent
A tool for front-end developers learning the browser event loop, often before an
interview. The learner pastes a **Script**, presses **Run**, and replays every step
of the **Trace** against a simulated Chrome 155 event loop. The UI only replays an
immutable Trace; it never drives the engine live.

One rule drives the layout: **one focal point per step.** Whatever changed in this
step must be obvious at a glance, and the reason must sit next to it.

## System
- Genre · developer tool, set in a TUI register. Cream page / near-black dark.
- Axes · one orange accent (always means **now**) / ANSI hues for event-loop concepts / ruled panes, no cards.
- Type · **Inter** 400/500/600 for titles, prose, values. **JetBrains Mono** 400/500 for every label, hotkey, id, number, code, queue item and console line. Uppercase is mono only; titles are lowercase. Ligatures off (`=>` must read as typed).
- Chrome · flat. Depth = tone steps (`bg` → `bg-raised` → `bg-panel`) + 1px lines. **Radius 0. No shadows.**
- Themes · dark by default, full light theme. Both pass WCAG AA.
- Languages · EN and VI. Vietnamese runs ~20–30% longer: labels never truncate mid-word; pane subtitles may wrap to two lines.

## Domain vocabulary (do not rename)
Script, Run, Trace, Trace Event, Task, Job, Checkpoint, Tick, Halt, Budget,
Virtual Clock, Unsupported API. Never "macrotask", "flush", "session".

## Layout — desktop (1440)
- **Header 48px** · lowercase title · `CHROME 155 MODEL` · mode nav `[E]EDIT` / `[R]REPLAY · RUN #3` · view nav `[1]PANELS [2]DIAGRAM [3]3D SCENE` · `[L]EN/VI` `[T]DARK` `[S]SHARE` `KEYS ON`. The active item has a 2px ink underline.
- **Halt banner 44px** (only when halted) · raised tone, 2px accent left rule, `▲ HALT · TASK BUDGET`, one sentence, `TIMING-SENSITIVE`, `RAISE BUDGET`.
- **Main grid**, columns separated by 1px `line` (gap:1px on a line-coloured ground):
  - Edit mode · `600px | 1fr` — Script editor | stage preview.
  - Replay · `320px | 1fr | 380px` — read-only Source | stage | Why rail. With the AI panel open, the right column becomes 400px and holds the panel instead of the rail.
- **Dock 92px** (pinned) · row 1: step counter · scrubber · Virtual Clock. Row 2: transport words · "what just happened" line · `PLAYBACK 1×` (a popover holding `SPEED` and `AUTO-PLAY`) · `[?]KEYS` · tour segment · `[D]DRIVE ME` `[V]TRACE` `[A]ASK AI`.

## Layout — mobile (≥360, designed at 390)
- Header 48px: title · `MENU` (language, theme, share, then the guides: Drive me, Ask AI). The view switch `PANELS DIAGRAM 3D SCENE` is a 44px row under it on the REPLAY tab only.
- Tabs 44px: `SCRIPT` / `REPLAY`.
- Replay: caption → one-line **Source peek** (current line) → panes. Only panes the step touched are open; the rest collapse to 44px summary rows. Console last.
- Dock pinned: step + "where", scrubber, five 52px targets `← TICK` `← STEP` `PLAY` `STEP →` `TICK →`. The tour bar (48px) sits above it while a tour runs.
- Edit: editor card + alerts; the Run footer (48px `RUN`) is pinned at the bottom and replaces the dock on the SCRIPT tab. While recording, a phone shows the spinner without its words.
- Ask AI and settings open as bottom sheets; the tour sheet sits above the dock.
- Hotkeys are not printed on touch.

## Edit ↔ Replay
- **Edit**: 600px editor (`SCRIPT · EDITING`), example picker, `[?]SUPPORTED APIS`, `RUN SETTINGS` + Budget summary, `[⌘↵]RUN`.
- **Running**: editor `LOCKED WHILE RUNNING`, `✻ Recording Trace… 1.2s · 18 events`, `[ESC]CANCEL` in red outline.
- **Replay**: the editor becomes a 320px read-only **Source** pane (`SOURCE · READ-ONLY · [E]EDIT`). The current line sits on a 2px accent rule with a hover-row fill. **Gutter squares** in concept hues mark lines whose work is still queued.
- The transition is a crossfade (opacity, 180ms). Editing the Script invalidates the Trace and disables Replay until the next Run.

## Focal hierarchy (per step)
1. **Caption** (`aria-live=polite`) · mono meta row `STEP 15 / 31 · TICK 1 · LINE 3 · VIRTUAL CLOCK 0 ms`, then one Inter 500 20/28 sentence naming the change, then the phase strip `TASK #1 ✓ → MICROTASK CHECKPOINT · JOB 1/3 → NEXT: TASK #2`. The current phase is tinted in its concept hue.
2. **Changed pane** · concept `-soft` tint, 2px top rule in the hue, `CHANGED` label. A running Call Stack shows `RUNNING`. Untouched panes stay plain bg.
3. **Changed item** · `-soft` fill, 1px full-hue border, `NEW` tag. Top stack frame: `TOP`. An item that left a lane: dashed ghost.
- Pane order follows run order: **Call Stack → Microtask Queue → Task Queue → Web APIs**, console below.

## Why rail (replay, right column)
- `WHY · <EVENT TAG> · TRACE EVENT n`, an Inter 500 17/24 title, a body paragraph in ink-2.
- A `※` admonition in task blue: "Why 'timeout' still waits".
- Spec links: `HTML §8.1.7.3 Perform a microtask checkpoint, step 2 ↗`.
- **Trace Events** list below: grouped by `TICK n · TASK #n — <SOURCE>`, rows `n · TAG · text`. The active row has a hover-row fill + 2px accent left rule; future rows are ink-3. `SHOW ALL [ ]` reveals frame push/pop noise.

## Views
All three show the same state at the same step. **Panels** is the default.
- **Panels** · 2×2 ruled grid + console pane.
- **Diagram** · nodes for Web APIs, Task Queue, Event Loop ring (conic phase arc), Call Stack, Microtask Queue, plus a console strip. 1px ink-3 edges; the live edge is 2px in the concept hue and carries a filled tag (`JOB #3 →`). Mobile stacks the nodes vertically with labelled connectors.
- **3D Scene** · isometric machine on a gridded floor: call-stack tower, Task and microtask trays, timer shelf, promise rack, console screen (overlay pane). Item tops are solid concept fills; sides mix the fill with `--scene-shade`. A new item gets a 1px hue ring with a bg-coloured gap.

## Control dock
- Transport words with printed keys: `[⌥←]TASK [⇧←]TICK [←]STEP [␣]PLAY [→]STEP [⇧→]TICK [⌥→]TASK`. PLAY is the only filled (primary) button.
- Scrubber: 4px raised track in a 28px grab area (36px on a phone); markers carry a title; lanes underneath (task blue = Task, magenta = Checkpoint); 2px green ticks for console output; red ticks for errors. Playhead = 2px × 24px accent bar.
- **Tour segment** (while a tour runs) · raised box: `TOUR 03/07` · (minimized: stop title) · `[P]PREV` · `[N]NEXT STOP` (primary) · `OPEN` when minimized. Next/Prev move the replay to each stop.
- `[A]ASK AI` · outline; pressed state = ink border + hover-row fill.
- **Drive me** lives in the dock only (not in the Script header). Its card shows `STEP 01 OF 14` over a 2px accent progress rule (scaleX), and the first step says how to leave.

## Ask AI
- The panel replaces the Why rail; nothing floats over the stage.
- Header `ASK AI · INTERVIEW COACH` · `SETTINGS` `MINIMIZE` `[ESC]CLOSE`.
- Context line `CONTEXT · RUN #3 · STEP 15 OF 31`. User turns are raised mono blocks with a `❯` prompt. Answers are Inter 14/22 ink-2 with mono concept ids, numbered steps (`01 02 03`), a `✓ INTERVIEW ONE-LINER` admonition, and link actions `JUMP TO STEP 20` / `START GUIDED TOUR`.
- Input: `❯ Ask a follow-up…` + `[↵]SEND`. Footer: model id · `YOUR OPENROUTER KEY`.
- **Empty state** "ask about this run" + `ADD API KEY`. **Error**: red admonition `⚠ OPENROUTER 401`.
- **Settings dialog** (500px, bg-panel, scrim): API key field (masked, `SHOW`, error state + `⚠ 401 — KEY REJECTED`), helper "Stored only on this device", model select with listbox (selected row: hover-row + accent rule), `REMOVE KEY` · `CANCEL` · `[↵]SAVE`.
- **Tour**: numbered stop list (`01 ✓ … 03` current on an accent rule), stop card (`STOP 03 OF 07 · STEP 15`, lowercase title, body), `❯ YOUR TURN` coach prompt in accent. It ends with a Recap stop.

## States
- **Empty / first visit** · without a share link the page opens on the "Sync, promise, async, timer" example; the stage shows ghost lanes labelled with what will appear; a centred pane `READY` / "press run to record a trace" / `[⌘↵]RUN SCRIPT` (the card's own Run).
- **Running** · see Edit ↔ Replay.
- **Halt** · banner, run badge `HALTED · BUDGET`, phase `HALT · BUDGET` in accent, last Trace Event `HALT` active.
- **Unsupported API** · red admonition `⚠ UNSUPPORTED API · RUN BLOCKED` with ruled rows `fetch · LINE 2`; offending tokens get a red wavy underline + `-soft` fill; the `SUPPORTED APIS` popover lists APIs grouped by concept. Run is disabled.
- **Syntax error** · gutter `↯`, red wavy underline on the token, inline lint row `↯ SYNTAXERROR …`, admonition with `GO TO LINE 3`. Run is disabled.

## Components
- **Queue item / stack frame** · raised fill, 1px `line-soft` border, **2px left rule in the concept hue**. Row 1: mono id in hue · Inter kind in ink-2 · `L3` · tag. Row 2: mono code 12.5/18. Optional note in ink-2.
  - default · NEW (soft fill + full-hue border) · TOP (hue-border at 59/5c alpha) · done/ghost (transparent, dashed `line`, no rule, ink-3 text).
- **Console line** · grid `36px tag | text | meta`, mono 12.5/22.
  - `LOG` ink-3 · `INF` ink-2 · `WRN` yellow + soft fill · `ERR` red + soft fill · **Uncaught** `ERR` + `Uncaught` label + 2px red rule · **Unhandled rejection** `REJ` + label + 2px red rule. Repeats collapse to `×498`.
- **Admonition** · raised fill, 2px left rule in its hue, mono label with glyph (`※ NOTE`, `▲ HALT`, `⚠ …`, `↯ …`, `✓ …`, `❯ YOUR TURN`); body Inter in ink-2.
- **Buttons** · primary = ink fill / bg text, mono 500 12; secondary = text-only word with printed key; hover = hover-row fill; destructive = red outline. **No pills, no icons-only controls.**
- **Nav / tabs** · mono words; active = ink + 2px inset ink underline; inactive = ink-2.
- **Pane header** · 38px, 8px hue square + mono title + count + right-aligned state label.

## Signature moves
- Hotkeys printed in the UI; `KEYS ON/OFF` toggle in the header.
- Mono labels over sans values.
- Concept-aware syntax highlighting: `setTimeout` in timer cyan, `Promise / then / queueMicrotask` in Job magenta, `console.log` in Console green. The Script previews where each call lands.
- Orange is spent on one thing: **now**.

## Motion
- Only `opacity` and `transform` animate. Nothing is perpetual except the recording spinner.
- `--motion-line` 90ms · current Source rule and active Trace row follow the step.
- `--motion-fast` 120ms · hover colour steps; focus ring appears instantly.
- `--motion-base` 180ms `--ease-out` · reveal (opacity + 4px rise) for NEW items and changed panes; Edit ↔ Replay crossfade.
- `--motion-slow` 280ms `--ease-swift` · **app exception**: an item travels lane → lane (FLIP), only during play/step, never on scrub. A dashed ghost is left at the source.
- `--spinner-frame` 110ms `--ease-term` · `✻` ping-pong in a fixed-width cell while the Worker records.
- `prefers-reduced-motion` · no travel, reveal or spinner; ghosts + NEW + hue rule still show what changed.

### Storyboards
- **A · Timer → Task Queue → Call Stack** (steps 24 → 26): Timer #1 pane reveals → item travels to the Task Queue tail as Task #2 (ghost left) → Tick 2 takes the head Task onto the stack → the callback frame pushes on top and the Source rule jumps to line 2.
- **B · Job in and out of the microtask queue** (steps 15 → 20): Job #3 arrives at the tail from the stack side → Job #1 pops (fade, 4px up), Job #2 moves to the stack → console row tints green once → Job #3 runs; queue empties; Checkpoint phase gets ✓.

## Keyboard map
Keys never fire while typing in the editor or AI input, or with an unrelated modifier.

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `←` / `→` | Step back / forward |
| `Shift ←` / `Shift →` | Previous / next Tick |
| `Alt ←` / `Alt →` | Previous / next Task |
| `Home` / `End` | First step / last step or Halt |
| `P` / `N` | Previous / next tour stop (tour running) |
| `A` | Open / close Ask AI |
| `E` / `R` | Edit Script / back to Replay |
| `⌘↵` (`Ctrl ↵`) | Run |
| `Esc` | Cancel Run · close panel or dialog |
| `1` `2` `3` | Panels / Diagram / 3D Scene |
| `L` `T` `S` | Language · theme · share link |
| `?` | Shortcut sheet |

## Accessibility (axe-tested)
- Every text token ≥ 4.5:1 on bg, raised and panel in both themes. Light accent is text-safe only as `#a94e2f`.
- Colour is never the only signal: each concept has a mono tag (STACK, JOB, TASK, TIMER, LOG, ERR); changes add CHANGED / NEW / TOP.
- Focus: 2px accent outline, 2px offset, on every control. Tab order follows the dock left → right.
- The caption is `aria-live=polite`: "Step 15 of 31. Microtask Checkpoint. Job #3 queued: then 2, behind Job #2. Line 3." During autoplay it announces at most once every 1.5s.
- Mobile hit targets ≥ 44px (dock 52px).

## Stack mapping (Vue 3 · Tailwind v4 · shadcn-vue)
| Surface | Component |
|---|---|
| Mode / view nav, console ALL/ERRORS | `Tabs` / `ToggleGroup` (restyled: mono words, underline) |
| Example picker, model, speed, language | `Select` |
| Supported APIs | `Popover` |
| Ask AI settings | `Dialog` |
| Mobile Ask AI, tour, Why | `Sheet` (bottom) |
| Scrubber | `Slider` (custom track with lane markers) |
| Auto-play, Show all, Keys | `Switch` (rendered as `ON/OFF` word) |
| Panes, Trace Events, chat | `ScrollArea` |
| Printed hotkeys | `Kbd` (bracket style, no box) |
| Halt, Unsupported API, syntax, 401 | `Alert` (admonition variant) |
| Shortcut sheet | `Dialog`, grouped Playback · Guides · Script and app, keys in brackets |
| Tags, counts | `Badge` (text-only variant) |
| Transport hints | `Tooltip` |

Set `--radius: 0` and remove all `shadow-*` utilities from the shadcn-vue defaults.

## Deviations from the base system
- Pane labels use 12px mono (the base system uses 13px); the app is denser than a blog.
- Lane-to-lane item travel (≤280ms) is allowed because it is replayed state, not decoration. Reduced motion turns it off.
- Unsupported API and SyntaxError use ANSI red, not yellow, because yellow is the Call Stack hue and both states block a Run.
- Syntax: vitesse-light/dark, except light string `#9a5a4a` and light number `#2a6f7f` (vitesse missed AA, the number on the active-line fill); punctuation uses ink-3.
- `--card` = `bg`: panes are ruled, not boxed.

## Notes
- Mockup data uses the sample Script (`script start` / `timeout` / `then 1` / `then 2` / `microtask` / `script end`). No lorem ipsum.
- The page tone belongs on `html`, never on `body`.
