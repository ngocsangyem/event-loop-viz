# UX/UI audit against Mobbin references

Date: 2026-10-23. Scope: the whole app at 1440×900 and 375×812, before and after a Run, plus the
Drive me tour and the shortcut sheet. Each finding pairs what the app did with how shipped products
solve the same problem (Mobbin links).

## Status (implemented 2026-10-23)

[DESIGN.md](../../DESIGN.md) already fixed some of these choices, so the work follows it where the
two disagreed. DESIGN.md now records the result.

| # | Outcome |
|---|---|
| 1 | Partly. The seven transport words and printed keys stay, as DESIGN.md requires. Speed and Auto-play moved behind one `PLAYBACK 1×` word, which leaves the dock row with the transport, the guides and KEYS. |
| 2 | Not changed. Printed hotkeys are a DESIGN.md signature move, so KEYS stays ON by default. |
| 3 | Done. The ready card has its own `[⌘↵]RUN SCRIPT`. |
| 4 | Done. The phone header is the title and `MENU`; the view switch shows on the REPLAY tab only. |
| 5 | Done. On the SCRIPT tab the Run footer is pinned and the dock is hidden; Drive me and Ask AI are in `MENU`. A new Trace already opened REPLAY. |
| 6 | Done for Drive me (dock only). Edit stays in both places, since DESIGN.md lists both. |
| 7 | Done. Without a share link the page opens on "Sync, promise, async, timer". |
| 8 | Done. Three groups, keys in brackets. |
| 9 | Done. A progress rule and an Esc hint on the first step. |
| 10 | Done. A 28px grab area (36px on a phone) and titled markers. Task names in marker tooltips are not done. |

Priority: **P1** = visible on every visit and costs comprehension; **P2** = friction on a common
path; **P3** = polish.

## Summary

| # | Area | Finding | Priority |
|---|---|---|---|
| 1 | Playback dock | 9 same-weight transport buttons plus 6 secondary controls in one row | P1 |
| 2 | Hotkey labels | `[E]`, `[1]`, `[⌥←]` prefixes on every control; KEYS defaults to ON | P1 |
| 3 | Empty state | "press run to record a trace" card covers the panels and has no action | P1 |
| 4 | Mobile header | ~280 px of chrome (4 stacked rows) before the editor | P1 |
| 5 | Mobile dock | Disabled PLAY looks like the primary button; Run and playback sit far apart | P2 |
| 6 | Duplicate actions | Drive me appears in the Script header and in the dock | P2 |
| 7 | First load | Opens on a 2-line "Custom" Script instead of a curated example | P2 |
| 8 | Shortcut sheet | One flat list, keys as plain text | P3 |
| 9 | Drive me tour | Good match to the pattern; lacks progress dots and a visual | P3 |
| 10 | Scrubber | Thin 2 px track, Task markers carry no label | P3 |

## 1. Playback dock: group and rank the controls (P1)

**Today.** One row holds START, TASK, TICK, STEP, PLAY, STEP, TICK, TASK, END, the auto-play switch,
the speed select, KEYS, DRIVE ME, TRACE and ASK AI. Each one looks the same: a monospace label in a
box. The eye has nowhere to land, and the user has to read the labels to find Play.

**References.** Media players keep one large central Play, with the skip controls drawn
symmetrically and smaller on each side. Secondary actions go to the far right as icons.
- [Disney+ player](https://mobbin.com/screens/f664c6b6-fd48-4c5d-9333-5aa34cc46fa5)
- [Paramount+ player](https://mobbin.com/screens/2375a7bd-a1af-4e96-b660-f19681466fcc)
- [TIDAL player](https://mobbin.com/screens/1a8ead18-cb85-4399-b9d7-4f63e8d0a523)

**Proposal.**
- Swap the three back/forward pairs for one **granularity segmented control** (`Step | Tick | Task`)
  with a single ◀ ▶ pair around a larger Play. That cuts 8 buttons to 3 plus the segment.
- Keep Start/End as small icon buttons at the edges, or reach them only by Home/End and the scrubber.
- Put the secondary tools (Trace, Drive me, Ask AI) in a separate right-aligned group with a divider
  between it and the transport. Move auto-play and speed into a small "⚙ playback" popover.
- Keep the existing hotkeys. Only the visual grouping changes.

## 2. Hotkey prefixes on every label (P1)

**Today.** The header and the dock print keycaps inline: `[E] EDIT`, `[1] PANELS`, `[L] EN/VI`,
`[⌥←] TASK`. KEYS is ON by default (`src/renderer/use-keys-visibility.ts`). The result is a dense
terminal look that newcomers have to decode.

**References.** Apps teach shortcuts in a sheet and in tooltips, and keep the labels clean.
- [Perplexity shortcut dialog](https://mobbin.com/screens/b0a63cb0-ff2e-49a9-90ab-b4dff7f8084d)
- [Cofounder shortcut dialog](https://mobbin.com/screens/2f5bbe84-7929-4d5e-8a3e-8a899c4c89a3)
- [Twenty GraphQL playground](https://mobbin.com/screens/190d144b-5b94-4ceb-9cb8-fd25ecd391a1), which
  lists its shortcuts inside the editor's starter comment.

**Proposal.** Make `off` the default for first-time visitors. Show the key in each button's tooltip
and on `:focus-visible`, so keyboard users still discover them. Users who turn KEYS ON keep the
current look.

## 3. Empty state: give it the action (P1)

**Today.** Before the first Run, a centred card ("READY / press run to record a trace") sits on top
of the Call Stack, Task Queue and Microtask Queue panels. It explains the idea but has no button. The
Run button is at the bottom-left of the Script pane.

**References.** Good empty states put the primary action inside them, plus one secondary path.
- [Canva home empty state](https://mobbin.com/flows/d3237fe5-9e7c-47ec-89e6-56ccfd951dc1): "Get
  started by creating a design" written as a link
- [beehiiv dashboard](https://mobbin.com/flows/2e01960d-3001-4150-9de1-f4e1fa95a825): an "Import
  List" button inside the empty panel
- [Codecademy workspace](https://mobbin.com/screens/6c2637ac-df41-47ef-9cba-fd4a08201fd9): a
  high-contrast Run button anchored right under the editor

**Proposal.**
- Add a primary `Run ⌘↵` button and a secondary "Pick an example" link inside the card.
- Don't cover the panels with it. Render the panels as faded "ghost" outlines with the card in the
  stage gutter, so the learner already sees where things will appear. `ghost-stage.vue` exists and
  may already support this.

## 4. Mobile: compress the header (P1)

**Today (375 px).** The page stacks four rows before any code:
1. title;
2. EN/VI, LIGHT and SHARE;
3. PANELS, DIAGRAM and 3D SCENE;
4. SCRIPT and REPLAY.

A fifth row follows: SCRIPT EDITI…, DRIVE ME, EXAMPLE and APIS (truncated). Together that is about
280 px of chrome.

**References.** Learning apps on phones show one compact top bar and get to the content quickly.
- [Mimo lesson](https://mobbin.com/screens/b8ce1ef7-9fbe-43af-a49b-f2348c587ebb): a close button,
  progress and a flag in one row, then the instruction and the code
- [Brilliant lesson](https://mobbin.com/screens/294228ef-6378-4cde-ae9d-de45dbb3474c): a progress bar
  in the top row and a sticky Continue at the bottom

**Proposal.**
- Row 1: the logo mark, the Script/Replay segment and an overflow `⋯` that holds language, theme and
  share.
- Show the view tabs (Panels/Diagram/3D) only on the Replay tab, where they matter.
- Drop the duplicated "SCRIPT" label from the toolbar.

## 5. Mobile: one sticky action bar (P2)

**Today.** Before a Run, the grey PLAY is disabled but is still the largest and most coloured button.
Run sits in a different band above it. DRIVE ME and ASK AI wrap onto a second row.

**References.**
- [Mimo](https://mobbin.com/screens/b8ce1ef7-9fbe-43af-a49b-f2348c587ebb): one floating primary
  action
- [Life Reset lesson](https://mobbin.com/screens/d01e9a25-0af7-4676-ab13-59b4c5073667): a full-width
  sticky "Next Lesson" button

**Proposal.**
- Use one sticky bottom bar whose primary button follows the state: **Run** in Edit, **Play/Pause**
  in Replay.
- Show ◀ ▶ only in Replay. Move Drive me and Ask AI into `⋯` or onto icon buttons.
- Switch to the Replay tab automatically when a Run finishes.

## 6. Remove duplicate entry points (P2)

Drive me shows in the Script pane header and again in the dock. Keep one, in the dock next to Ask AI
since both are guided modes. The same applies to `[E] EDIT`, which shows in the header and the Script
header during Replay.

## 7. Open on a curated example (P2)

**Today.** A first visit opens on "Custom" with a 2-line timer Script, which shows nothing about
microtasks.

**References.**
- [Twenty](https://mobbin.com/screens/190d144b-5b94-4ceb-9cb8-fd25ecd391a1) and
  [Codecademy](https://mobbin.com/screens/6c2637ac-df41-47ef-9cba-fd4a08201fd9): both seed the editor
  with a teaching sample.

**Proposal.** On a first visit with no share link, load "Sync, promise, async, timer". It covers all
four queues, and its lesson video is the first one to watch.

## 8. Shortcut sheet: group it (P3)

The sheet (`shortcut-sheet.vue`) is accurate but flat. Grouping it as
[Perplexity](https://mobbin.com/screens/b0a63cb0-ff2e-49a9-90ab-b4dff7f8084d) and
[Microsoft Teams](https://mobbin.com/screens/958c4c1a-d6f2-4062-b350-910a60c174e4) do (Playback ·
Navigation · Modes · App) would help. Draw the keys with the existing `kbd` component and add a legend
row for the ⌥/⇧/⌘ symbols.

## 9. Drive me tour: already on pattern (P3)

The tour has a spotlight, a step counter ("STEP 01 OF 14"), Prev/Next/End and an "Under the hood"
disclosure, which matches [Front](https://mobbin.com/flows/fbcd68e6-4169-4e6c-81be-51d574c743d8) and
[Miro](https://mobbin.com/flows/8b9e6af8-0a9c-422f-9285-73e5c96183fb). Two small adds:
- a progress bar or dots across the top of the popover;
- on the first step, a one-line "You can leave any time with Esc" hint, as
  [Uxcel](https://mobbin.com/screens/63fbc484-500d-4986-9150-9c5c51584b27) does with Skip.

## 10. Scrubber: bigger hit area, labelled markers (P3)

The track is about 2 px tall, so it is hard to grab with a finger. Its Task markers are bare ticks.
Make the hit area 24 px with a track that thickens on hover, as on
[Higgsfield](https://mobbin.com/screens/edc0ea14-121c-4434-a858-7c9aa38654a1) and
[Zoom](https://mobbin.com/screens/07b39cf2-8baa-4902-a664-94d8c90e4a18). On hover or drag, show a
tooltip with the Task name ("Task #2 · setTimeout callback").

## What already works

- The step caption and the phase strip (`TASK #1 → MICROTASK CHECKPOINT → NEXT: IDLE`) give a clear
  "where am I" header.
- Source-line highlighting and the "queued work this line created" markers.
- The Panels view: each panel has a one-line definition and an obvious empty state ("No Jobs
  waiting").

## Suggested order

1. Dock regrouping (#1) and KEYS off by default (#2): one PR, desktop and mobile.
2. Empty state with an action (#3) and the default example (#7).
3. Mobile header and sticky bar (#4, #5, #6).
4. Polish (#8–#10).

## Unresolved questions

- Marker tooltips name the event family and its number, not the Task's callback. Is the Task name
  worth adding?
