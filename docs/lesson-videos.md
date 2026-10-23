# Lesson videos

Every built-in example has a narrated lesson video in Vietnamese and in English. The Script pane
header shows a **Video lesson** button when the current Script is an example that has one. The
video plays in the app's language and falls back to the other language when that is the only one.

The videos are rendered from code in [`motion/lessons/`](../motion/lessons/). Nothing in a video
is hand-animated. Every state on screen comes from the app's own `runScript()` Trace of the
example, replayed with the app's own player and panel models. The narration only says where each
step stands on the Trace and why it happens.

## Layers

| Layer | Where | What it holds |
|---|---|---|
| Example source | `oracle/fixtures/*.js` via `src/examples/example-library.ts` | The Script, the same file Chrome was recorded on |
| Execution timeline | `motion/lessons/timeline/` | Trace → `LessonSnapshot`s (stack, queues, Web APIs, loop phase, console, code line) and checks |
| Narration | `motion/lessons/content/<example-id>.ts` | Intro, overview, steps anchored on Trace events, "why" points, recap, in `vi` and `en` |
| Animation | `motion/lessons/film-visualized/` | The shipped style: editor-window code, console, gradient-bordered runtime panels, spotlight focus, cards that travel through the event loop, why card, recap |
| Animation (earlier) | `motion/lessons/film/` | The hand-drawn style with captions, kept for `--style=sketch`. Its clock, easing and DOM helpers are shared by the shipped style |
| Rendering | `motion/lessons/pipeline/` | Plan, voice, render, QA, manifest |
| Output | `public/videos/event-loop/<example-id>/<lang>.mp4` | Served as static files, tracked with Git LFS |

Each lesson follows the same five scenes: Introduction (the code and a question), Runtime
overview (only the parts this example uses), Step-by-step execution, Why does this happen, and
Recap.

## Pipeline

Run these from the repository root. Use Node 24 (`PATH=/opt/homebrew/bin:$PATH` on the
maintainer's machine). The voice step needs `OPENAI_API_KEY` in `.env.local`.

```bash
node motion/lessons/pipeline/plan-lessons.mjs [id ...]
```

The plan step runs each example in the engine and builds `motion/lessons/out/<id>/plan.<lang>.json`.
It fails when:

- the content no longer fits the Trace;
- a visible move is left unnarrated, or a step crams in more than 7 moves;
- the console output differs from the run;
- English narration contains Vietnamese, or narration contains code symbols;
- the intro question gives the answer away.

```bash
node motion/lessons/pipeline/voice-lessons.mjs [id ...] [--lang=vi,en]
```

The voice step makes one clip per beat with OpenAI `gpt-4o-mini-tts` (voice `coral`, both
languages). It measures each clip and lays the beats out on time (`timing.<lang>.json`,
`narration.<lang>.wav`). Clips are cached by text, so editing one line only re-voices that line.

A single voice reads Vietnamese and keeps the JavaScript terms in English pronunciation. Two other
approaches were tried and rejected: a Vietnamese-only voice mispronounced the terms, and splicing
two voices together sounded broken.

```bash
node motion/lessons/pipeline/render-lessons.mjs <id> [--lang=vi,en]
```

The render step paints every frame of `motion/lessons/film-visualized/` through `window.seek(t)` in
headless Chromium and encodes
H.264 High at 1920×1080, 30 fps, yuv420p (BT.709, limited range), CRF 24 with
`-tune animation`, AAC voice at -14 LUFS, and `+faststart`. It then rewrites
`src/examples/example-video-manifest.json`. A 5-minute lesson renders in about 5 minutes and
comes out at about 15 MB.

Pass `--style=sketch` to paint the earlier hand-drawn film instead. It writes to
`out/<id>/sketch.<lang>.mp4` and leaves the app's videos and manifest alone.

Review and QA:

```bash
node motion/lessons/pipeline/render-lessons.mjs <id> --lang=vi --contact
```

```bash
motion/.venv/bin/python motion/lessons/pipeline/check-voice-sync.py <id> <lang>
```

```bash
node motion/lessons/pipeline/inspect-lesson-trace.mjs <id>
```

- `--contact` gives one frame per beat, as `out/<id>/contact-<lang>.png`.
- `check-voice-sync.py` transcribes the video with local Whisper and checks that each beat's
  words fall inside that beat.
- `inspect-lesson-trace.mjs` is the authoring aid. It prints display line numbers, the output,
  and every view change.

To audition voices, run `node motion/lessons/pipeline/voice-sample.mjs [voice ...]`. It writes
to `plans/samples/`.

## Adding a lesson for a new example

1. Add the example to `src/examples/example-library.ts`.
2. Run `inspect-lesson-trace.mjs <id>`. Write `motion/lessons/content/<id>.ts`, using
   `sync-promise-async-timeout.ts` as the model. It is picked up automatically.
3. Run plan, then voice, then a contact sheet. Review it, then do the full render.
4. Commit the content file, the MP4s (LFS) and the manifest.

## Visual style

The shipped style is modelled on Lydia Hallie's *JavaScript Visualized – Event Loop*. The study
and the rules taken from it are in
[`research/event-loop-visualized-video-spec.md`](research/event-loop-visualized-video-spec.md).

- **Layout:** the Script sits in an editor window on the left, with the console under it. The
  runtime is drawn as a diagram on the right: Call Stack and Web APIs on top, then the Event Loop
  column next to the Task Queue and Microtask Queue.
- **Intro:** asks the question first, with one "?" per line the Script will print.
- **Spotlight:** while a part is introduced or explained, it stays lit and the others dim.
- **Moves:**
  - A frame appears faint in place, then solidifies.
  - A Web API card fills its callback and delay slots.
  - A finished timer wobbles, then leaves.
  - Work taken from a queue travels through the Event Loop column on its way to the stack.
- **Code panel:** dims once the Script's own Task ends. Only the callback lines that still run
  stay lit.

The two styles differ in a few ways:

- This style shows no captions; the hand-drawn film does.
- The Script is still drawn as a Task taken by the event loop, which the original video skips.

## Timing rules

Picture time is derived from voice time (`pipeline/lay-out-beats.mjs`):

- A beat never ends before its sentence and its pause have finished.
- The moves of an execution step are spread across the sentence, in order.
- A new scene gets a longer lead-in.

The film is a pure function of time: it uses no CSS transitions, timers or animation frames when
rendering. Randomness comes only from seeded noise (mulberry32), which gives the sketch strokes
their wobble.

## Deployment

The MP4s are stored with Git LFS (`.gitattributes`). Clone with `git lfs install` done once.
Vercel needs Git LFS turned on in Project Settings → Git; otherwise the deployed files are LFS
pointers and the player shows its error state.
