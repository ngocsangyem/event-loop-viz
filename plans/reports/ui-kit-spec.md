# UI kit spec — Event Loop Visualizer (Claude Design source of truth)

Source: Claude Design project `d76ac8d4-5b6e-4044-b2f4-f999f9b75655`, `ui_kits/event-loop-visualizer/*` and
`components/**` (React kit, read 2026-10-22). Values below are verbatim from the kit. Token names are the
repo's (`docs/design/tokens.css`): `--foreground`=ink, `--foreground-2`=ink-2, `--muted-foreground`=ink-3,
`--secondary`=bg-raised, `--popover`=bg-panel, `--accent`=hover-row, `--brand`/`--brand-text`=accent,
`--border`=line, `--border-soft`=line-soft. "mono label" = `500 12px/1 mono, letter-spacing .02em`.

Kit simplifications NOT to copy: canned data (`data.js`), "NOT IN THIS KIT" placeholder for Diagram/3D,
hard-coded `0 ms` clock, `RUN #1`, 1.2s fake recording, missing tour/halt/mobile (those are in DESIGN.md).

## Tokens added by the kit (now in tokens.css)
Type line/tracking: display 24/30 -0.02em · caption 20/28 -0.01em · heading 17/24 -0.01em · body 14/22 ·
row 13/30 · small 12.5/17 (Inter) · label 12 +.02em · meta 11.5/16 · micro 11/14 · code 13/22 · item 12.5/18 (mono).
Spacing 4/6/8/10/12/16/20/24/28/32. Controls sm 30 · md 36 · lg 40 · touch 48. Pane header 38. Banner 44.
`--reveal-distance` 4px (0 reduced). Base: ligatures + `calt` off everywhere, antialiased, `::selection`
brand bg / primary-foreground text, links ink with line-colour underline (offset 3px) → brand-text on hover.

## Primitives
- **Button** · height by size sm30/md36/lg40/touch48 · gap 5 · padding `0 9px` secondary, `0 12px` others ·
  mono label · disabled opacity .35 · bg transition `--motion-fast --ease-out`. Hotkey `[k]` before label in
  ink-3 (primary: inherit at .75 opacity). Variants: primary ink fill/bg text no border; secondary transparent
  → hover-row; outline 1px line → hover-row; destructive 1px error border, error text, hover error-soft;
  pressed hover-row fill + 1px ink border.
- **Kbd** · `[keys]` mono label in ink-3, no box (inverse: inherit .75).
- **Tag** · `500 11.5px/1` mono uppercase +.02em; concept hue, or default ink / muted ink-3 / now brand-text.
- **Switch** · button role=switch, height 36, gap 6, padding `0 8px`, mono label, then `ON` in console green /
  `OFF` in ink-3. Disabled .35.
- **NavTabs** · height 48 (header), buttons padding `0 10px` gap 4, mono label; active ink + `inset 0 -2px 0 ink`;
  inactive ink-2; disabled .55; hotkey `[k]` ink-3.
- **Admonition** · padding `10px 12px`, bg-raised, `inset 2px 0 0 <hue>`, no border, gap 16. Label
  `500 11.5px/14px` mono +.02em in hue, `<glyph> <LABEL>`; body Inter `400 13.5px/21px` ink-2. Optional action:
  mono 12/20 ink underlined (offset 3). Tones: note task ※ · halt brand ▲ · error error ⚠ · syntax error ↯ ·
  success job ✓ · prompt brand ❯. role=alert for error/syntax.
- **Dialog** · width 500, bg-panel, 1px line. Header 44px, padding `0 20px`, bottom line, mono label title +
  `[ESC]CLOSE` right. Body padding 20 gap 20. Footer min-height 60, gap 6, padding `0 20px`, top line. Scrim
  `--scrim`, centred.
- **TextField** · label `500 11.5px/14px` mono ink-3; box height 40, 1px line (error: 1px error), bg; input
  mono 13 padding 0 12; right action mono 11.5 (`SHOW`); error `⚠ msg` mono 12/16 error; helper Inter 13/20 ink-2.
- **Select** · same label; trigger height 40, 1px line (open: 1px ink), mono 13, `▾` ink-3. Listbox 1px line,
  rows mono 13/34 padding 0 12, row dividers line-soft, selected hover-row + `inset 2px 0 0 brand`.
- **PromptInput** · box height 40, 1px line, bg, padding `0 4px 0 12px`, `❯` brand mono 13, input mono 13,
  submit `[↵]SEND` mono 11.5 (key ink-3). Hint below mono `400 11px/14px` ink-3.

## Event-loop components
- **Pane** · bg; changed → `<hue>-soft` over bg + `inset 0 2px 0 <hue>`. Header 38px, padding `0 16px`, gap 8,
  mono label: 8×8 hue square · TITLE · count (ink-3, tabular) · spacer · state label in hue (`CHANGED`/`RUNNING`).
  Subtitle Inter `400 12.5px/17px` ink-2, padding `0 16px 10px`. Body padding `0 16px 16px`, column gap 6.
  Empty slot: 1px dashed line, padding 14, Inter 12.5/17 ink-3, centred text.
  Subtitles: Call Stack "Runs now. The top frame executes." · Microtask "Jobs. All of them drain at each
  Checkpoint." · Task "One Task per Tick, after the Checkpoint." · Web APIs "Timers and MessageChannel ports."
  Empty texts: "Empty — the loop can move on" · "No Jobs waiting" · "No Tasks waiting" · "No pending timers".
- **QueueItem** · column gap 3, padding `7px 10px`, bg-raised, 1px line-soft, `inset 2px 0 0 <hue>`.
  NEW: hue-soft bg + 1px full hue border. TOP: 1px hue-border. done/ghost: transparent, 1px dashed line, no rule,
  ink-3 id/code. Row 1 (`500 11.5px/15px` mono, gap 8): id in hue · kind Inter `400 12px/15px` ink-2 ellipsis ·
  `L3` ink-3 margin-left auto · tag `NEW`/`TOP` in hue. Row 2 code mono `400 12.5px/18px` ellipsis. Note Inter 12/16 ink-2.
- **ConsoleLine** · grid `36px minmax(0,1fr) auto` gap 8 padding `0 16px`, mono `400 12.5px/22px`. Tag
  `500 11px/22px` +.02em: LOG ink-3 · INF ink-2 · WRN warn (+warn-soft row) · ERR error (+error-soft) ·
  Uncaught = ERR + "Uncaught " label + `inset 2px 0 0 error` · REJ "Unhandled rejection ". New line:
  console-soft bg + `inset 2px 0 0 console`. Meta mono `400 11px/22px` ink-3 (`L3 · JOB #1`). Count ink-3, ml 10.
- **PhaseStrip** · mono label row, gap 10, `→` separators in ink-4 (aria-hidden). done: ink-3 + ` ✓`; next: ink-3;
  now: hue text on hue-soft, padding `5px 7px`, `inset 0 -1px 0 <hue>`; halt: brand-text, same padding,
  `inset 0 -1px 0 brand`.
- **TraceEventRow** · grid `44px 44px minmax(0,1fr)` gap 8, height 31, padding `0 20px 0 12px`, bottom line-soft.
  n mono `400 11.5px/30px` tabular ink-3 right-aligned · tag mono `500 11px/30px` in hue (STACK JOB TASK TIMER LOG
  ERR HALT; halt brand-text) · text Inter `13px/30px` ellipsis (400; active 500). Active: hover-row + `inset 2px 0 0
  brand`, aria-current=step. Future: ink-3. Group header: padding `12px 20px 4px`, mono `500 11px/14px` ink-3,
  bottom line-soft (`TICK 1 · TASK #1 — SCRIPT`).
- **Scrubber** · height 22, flex 1, role=slider. Track 4px at top 8: bg-raised + `inset 0 0 0 1px line-soft`.
  Fill to playhead: ink-2 at .55 opacity. Lanes 3px tall at top 15 (task / job hues). Output ticks 2×5 at top 0
  (console green; errors red). Playhead 2px × 24px brand, `0 0 0 2px bg` halo, `left` transition --motion-line.

## App regions
- **Header** · height 48, padding `0 20px`, gap 28, bottom line, align stretch. Left: title "event loop
  visualizer" Inter `500 16px/1` -0.01em + `CHROME 155 MODEL` mono `500 11px/1` +.02em ink-3 (gap 12). Mode NavTabs
  `[E]EDIT` `[R]REPLAY · RUN #n` (disabled without Trace). Spacer. View NavTabs `[1]PANELS [2]DIAGRAM [3]3D SCENE`.
  1px vertical line (margin 14px 0). Right buttons (padding 0 8, gap 4, mono label, ink): `[L]EN/VI` (other lang
  ink-3), `[T]DARK`, `[S]SHARE`, `KEYS ON` (ON console green). Hotkeys ink-3.
- **Main grid** · gap 1 on line ground. Edit `--col-editor | 1fr`; Replay `--col-source | 1fr | --col-rail`
  (`--col-ai` when Ask AI open).
- **Editor pane (edit)** · header 40px padding `0 16px` gap 12 bottom line-soft: `SCRIPT` + `EDITING` ink-3 (running:
  `LOCKED WHILE RUNNING` brand-text) · spacer · `EXAMPLE <name> ▾` (ink-2, name ink) · `[?]SUPPORTED APIS` (open:
  `inset 0 -2px 0 ink`). Editor card margin `16px 16px 12px`, bg-raised, 1px line-soft; card header 32px mono
  `500 11px` ink-3 `JS · SCRIPT.JS`; gutter 40px right-aligned ink-3; code mono 13/22. Unsupported tokens: error
  colour, wavy error underline offset 4, error-soft bg. Blocked → error Admonition `UNSUPPORTED API · RUN BLOCKED`
  (margin 0 16 16). Supported-APIs popover: top 40 right 16 width 340, bg-panel, 1px line, padding 16 gap 14;
  groups `TIMER · WEB APIS` / `JOB · PROMISES` / `LOG · CONSOLE` (mono 11/14 in hue) over mono 12.5/19 list; footer
  Inter 13/20 ink-2 with top line-soft. Footer bar 56px padding 0 16 gap 16 top line: `RUN SETTINGS` (underlined
  mono label) · `BUDGET 500 TASKS · 10,000 JOBS · 60 s` mono 11.5 ink-3 · spacer · primary lg `[⌘↵]RUN` (running:
  `✻ Recording Trace…` mono 12.5 ink-2 with brand spinner in a 14px cell + destructive `[ESC]CANCEL`).
- **Ghost stage (edit)** · 2×2 + 130px console row, gap 1, each cell `0 0 0 1px line-soft`, padding 16 20: 8px
  square + mono title, Inter 12.5/17 ink-3 hint ("What runs right now" · "Jobs: promise reactions,
  queueMicrotask" · "Tasks: timer callbacks, messages" · "Timers waiting on the Virtual Clock" · "Output, errors
  and rejections"). Centre card 460w, bg-panel, 1px line, padding 28 gap 12: status label (`READY` ink-3 /
  `WORKER BUSY` brand-text / `⚠ RUN BLOCKED` error), Inter 500 24/30 -0.02em title, Inter 15/24 ink-2 body.
- **Source pane (replay)** · header 40px like editor: `SOURCE` `READ-ONLY` (ink-3) · spacer · `[E]EDIT`. Code card
  margin `16px 16px 0`, bg-raised, 1px line-soft, padding 8 0, mono `12.5px/21px`. Row grid `34px 14px 1fr`:
  number (current: brand-text) · gutter squares 6×6 per queued concept (column gap 3, pt 7) · code. Current line:
  hover-row + `inset 2px 0 0 brand`, bg transition --motion-line. Legend under card (margin 10 16 0): two 6px
  squares + `QUEUED WORK THIS LINE CREATED` mono 11/14 ink-3. Footer (padding 14 16, top line): `RUN #n` +
  `ENDED NATURALLY` console green; `31 TRACE EVENTS · 2 TICKS · 0 → 0 ms` mono 11.5/17 ink-3.
- **Stage caption** · padding 16 20, bottom line, gap 12, aria-live=polite. Meta row mono label gap 16:
  `STEP n / N · TICK t` · `LINE l` brand-text · spacer · `VIRTUAL CLOCK` ink-3 + value ink. Sentence Inter
  `500 20px/28px` -0.01em, min-height 56, text-wrap pretty; `Task #n` / `Job #n` / `Timer #n` inline in mono .92em
  400 in concept hue. Then PhaseStrip.
- **Stage panes** · 2×2 grid gap 1 on line; order Call Stack, Microtask, Task, Web APIs. Console pane below:
  height 178, top line, header 38 (square + `CONSOLE` + count ink-3); changed → console-soft + `inset 0 2px 0 console`.
- **Why rail** · head padding `16px 20px 18px` gap 12 bottom line: `WHY` · spacer · `TRACE EVENT n` ink-3; body
  Inter 14/22 ink-2; note Admonition; spec link Inter 13/19 with aria-hidden `↗`. Then 38px header `TRACE EVENTS`
  + count ink-3 (padding 0 20), then grouped TraceEventRows (scroll).
- **Ask AI panel** · bg-panel. Header 40px padding 0 16 gap 14 bottom line: `ASK AI` `INTERVIEW COACH` (ink-3) ·
  spacer · `SETTINGS` (ink-2) · `[ESC]CLOSE`. Body padding 16 gap 16: `CONTEXT · RUN #n · STEP n OF N` mono 11/14
  ink-3; user turn padding 10 12, bg-raised, 1px line-soft, mono 13/20, brand `❯`; answer Inter 14/22 ink-2,
  lead sentence ink 600, concept ids mono 13 in hue, success Admonition `INTERVIEW ONE-LINER`. Footer padding
  `12px 16px 14px` top line: PromptInput with hint `<model id> · YOUR OPENROUTER KEY`.
- **Ask AI settings** · Dialog `ASK AI SETTINGS`: intro Inter 14/22 ink-2; TextField `OPENROUTER API KEY`
  (password, action SHOW, helper "Stored only on this device."); Select `MODEL`. Footer: secondary `REMOVE KEY`
  in error colour · spacer · outline `CANCEL` · primary `[↵]SAVE`.
- **Dock** · height 92, top line, bg. Row 1: 38px, padding 0 20, gap 16 (opacity .4 when no Trace): `STEP n / N`
  mono label tabular min-width 132 · Scrubber · clock mono 12 ink-3. Row 2: flex 1, padding 0 12, gap 2, top
  line-soft: transport lg buttons `[⇧←]TICK [←]STEP [␣]PLAY(primary; PAUSE while playing) [→]STEP [⇧→]TICK` ·
  caption line Inter 13 ink-2 ellipsis padding 0 16 ("No Trace yet — press Run") · Switch `AUTO-PLAY` · 1px×28
  divider (margin 0 8) · lg `[A]ASK AI` (outline; pressed when open; disabled without Trace).
  Kit omits the `⌥` Task jumps, legend, SPEED, `[?]KEYS` and tour segment that DESIGN.md lists — keep those.
