# FLIP animation research: how items move between queues

Scope: how the Panels view animates a callback chip leaving one lane (Script / Web APIs / Task Queue / Microtask Queue / Call Stack) and landing in another. Sources:
- Real-app references from Mobbin. These are static frames, so they show what the First and Last states and the in-between state look like, not the motion curves.
- The canonical FLIP write-up (Paul Lewis, aerotwist.com).
- The GSAP Flip plugin docs (gsap.com/docs/v3/Plugins/Flip).

## 1. FLIP in one paragraph

FLIP stands for **F**irst, **L**ast, **I**nvert, **P**lay:
1. **First:** measure the element where it starts.
2. **Last:** apply the final DOM or state, then measure it again.
3. **Invert:** apply a transform so the element *looks* like it is still at First.
4. **Play:** remove that transform with a transition.

The expensive work (layout reads) happens once, inside the ~100 ms after input that users do not perceive as lag. The animation itself touches only `transform` and `opacity`, which run on the compositor with no per-frame layout or paint.

Caveats from the source:
- Scaling distorts content such as text.
- Measuring forces a synchronous layout.
- A new measurement must not interrupt a running animation in a way the eye can see.

## 2. What real apps show (Mobbin)

| Pattern | Seen in | What happens |
|---|---|---|
| Origin keeps a placeholder | [Jira: moving a task](https://mobbin.com/flows/bc08701d-f5f3-4b98-beef-584970abe4dc), [Zoom: moving a kanban card](https://mobbin.com/flows/f92a3186-5f6d-477f-aca1-10f4df694a71) | While the card travels, its old slot stays as a faded copy (Jira) or a grey block (Zoom). The source never "jumps closed" mid-move. |
| Destination announces itself | Jira (same flow) | The target column is outlined and its header reads `CONCEPTING → DESIGN` during the move. The column count updates on landing (`DESIGN 1 → 2`). |
| Lifted item | Jira, [Weverse: reordering songs](https://mobbin.com/flows/65e7bf52-fd2d-4ead-b2a5-898f15ecc374), [Singapore Airlines: reordering playlist](https://mobbin.com/flows/67290683-1cb6-4bd4-84b3-49acdaf961da) | The moving item is offset, slightly tilted or inset from its row, and drawn above everything. It reads as "picked up", not "sliding". |
| Siblings make room while it travels | [Spotify: reordering a queue](https://mobbin.com/flows/eb0944b9-888a-48b2-bed6-917cc124394b), Weverse | The rows under the moving item shift during the move, not after it. The slot is open when the item arrives. |
| Removed row collapses, rest slide up | [Deezer: reordering songs](https://mobbin.com/flows/405f9b5f-61ea-4b76-bb5f-d24742559bf6) | Classic FLIP on siblings after a removal. |
| Translucent drag copy + insertion line | [Microsoft Loop: moving a card](https://mobbin.com/flows/c3595dd7-ffc1-4828-a7b0-98044562836e) | The copy is semi-transparent over the origin, and a 1px line marks where it will land. |
| Landing changes state colour | Zoom | The card's status pill switches from `In progress` to `Done` on arrival: the move and the state change read as one event. |
| Queue lists are flat rows, current item tinted | [Spotify web queue](https://mobbin.com/screens/348167b8-3517-4f96-9dfb-0df3295ce72a), [TIDAL play queue](https://mobbin.com/screens/dc12eb80-5356-4401-a0f5-07251bfd1ae7), [YouTube Music up next](https://mobbin.com/screens/2943f905-1317-477a-99fd-b91eb373834f) | "Now playing" is separated from "Next up" by a label, not a box. This already matches our TOP / NEW tags. |

## 3. How the app does it today

| Piece | File | FLIP? | Notes |
|---|---|---|---|
| Sibling glide in a lane | `panels/panel-motion.css` `.queue-item-move` | Yes. Vue `TransitionGroup` does F/L/I/P on transform. | Runs on `--motion-slow` (280 ms), independent of the flight length. |
| Row enter / leave | `panels/panel-motion.css` | n/a (a reveal, not a move) | The leaving row gets `position: absolute` so siblings can glide. This is the same trick as GSAP Flip's `absolute`. |
| Chip flight between lanes | `panels/chip-flight.ts`, `panels/use-chip-travel.ts` | Yes, as a "shared element via overlay ghost". First = `rectOf` before `nextTick`; Last = after the patch; the ghost is fixed in an overlay. | Now a GSAP timeline (pop, curved travel, settle). It still tweens **`width`**, which is a layout property, every frame. |
| Departed placeholder | `panels/use-departed-items.ts`, `queue-ghost-row.vue` | n/a | A dashed ghost row at the origin for one step. This matches Jira and Zoom. |
| Interruption | `use-chip-travel.ts` `finish()` | No | A new step ends every flight at once (the ghost vanishes and the chip snaps). Fast stepping looks jumpy. |
| Diagram signal | `diagram/use-diagram-motion.ts` | n/a (a path animation) | Already cancels cleanly. |

## 4. Recommendations, ranked by visible gain vs cost

### R1. Retarget mid-flight instead of snapping (biggest visible win)
- **Problem:** on a new step, `finish()` kills the ghost, so the chip teleports.
- **Fix:** before `finish()`, record each live ghost's *current* rect by chip id. That is the true FLIP "First" for the next move. Use it as `origin` for the next flight of the same chip id, instead of the chip's DOM rect.
- **Why it works:** the next flight then starts exactly where the eye is.
- **Cost:** a `Map<chipId, ChipRect>` in `use-chip-travel.ts`, about 15 lines.
- **Risk:** low. It falls back to today's behaviour when an id is not in flight.

### R2. Stop tweening `width`; keep the flight on transform and opacity only
- **Problem:** `width` re-lays out the ghost (and its text) every frame.
- **Options:**
  - (a) Fix the ghost at the *Last* width and fade it in from the origin. Chips in different lanes differ by only a few px, so the change is invisible.
  - (b) Use `clip-path: inset()`. It costs paint, not layout, and the text is not distorted.
- Avoid `scaleX`: code text in the chip would visibly squash, which is the source's "scale distorts content" caveat.
- **Cost:** about 5 lines in `chip-flight.ts`.

### R3. Sync the lane glide with the flight
- **Problem:** siblings in the destination lane finish their glide (280 ms) long before the chip lands (`travelMs`, up to ~1 s). The slot sits open and empty.
- **Fix:** give the move transition the flight's travel phase (`--travel-ms` set on the panels root from `travelMs`), as Spotify and Weverse do. The source lane's collapse can stay fast.
- **Cost:** one CSS custom property, plus a style binding in `replay-stage.vue` or the panels root.

### R4. Destination cue on the target lane (Jira's `A → B`)
- During a flight, mark the destination lane with `data-receiving`: a 1px `--brand` rule on the panel header, cleared on landing.
- Optional: a mono `← SCRIPT` source tag in the header, using glossary names only.
- This is text and line only, so it fits DESIGN.md: no shadow, radius 0.
- **Cost:** `arriving` already knows which ids land. We need a lane lookup and a class.

### R5. Land as one event (Zoom's status pill)
- Fire the row's NEW tag and the lane count change on the timeline's settle phase (`onComplete` / a `landed` label), not at patch time.
- Today the NEW badge is visible on the hidden real chip's row before the ghost arrives.
- **Cost:** a `landed` set in `ChipTravelState`, and a check in `queue-list.vue` `tagOf`.

### R6. Consider GSAP `Flip` only for the sibling glide, not the flight
- `Flip.getState` / `Flip.from({ absolute, nested, prune, simple, targets })` could replace the `TransitionGroup` move.
- **Gain:** interruptible sibling glides (R1 for siblings) and `onEnter` / `onLeave` in the same timeline as the flight.
- **Cost:** Vue `TransitionGroup` would have to be turned off for those rows (Flip and `TransitionGroup` both write `transform`). Elements re-rendered by Vue must be passed via `targets`.
- **Verdict:** only if R1–R3 still look jumpy. The overlay-ghost flight should stay as it is, because Flip cannot move an element across lanes that Vue owns without fighting the virtual DOM.

### Not recommended
- **Tilt or rotation on lift (Jira):** this is drag affordance. Our items are not dragged, and rotation fights the flat, ruled look.
- **Translucent drag copy (Loop):** it reads as "draggable".
- **Shadows for elevation:** DESIGN.md says depth is a line, not a shadow. The pop's lift and swell, plus `--brand` on the outline, are the equivalent.

## 5. Guardrails (all recommendations)
- Animate only `transform` and `opacity`. `clip-path` is the one allowed exception, for R2(b).
- Measure in a single batch:
  - First: all `rectOf` before `nextTick`.
  - Last: all `rectOf` after it.
  - Never interleave reads and writes.
- Reduced motion: keep today's rule that nothing moves, and the end state is exact.
- The end DOM must equal a never-animated render: no leftover inline styles. Use `clearProps` and remove the ghost.
- Do not change the Trace or `ObservableEntry`. All of this is renderer-only.

## Unresolved questions
1. R4 needs the destination lane: is a `data-lane` attribute on panel roots acceptable, or should the lane come from `chipsOf` placement?
2. R5 changes when the NEW tag appears (on landing instead of at the step). Does the step announcer or e2e rely on NEW being present synchronously?
3. R6: is the GSAP dependency acceptable for more than the flight? It is already added for `chip-flight.ts`.
