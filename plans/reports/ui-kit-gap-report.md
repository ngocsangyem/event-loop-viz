# UI kit gap report: kit spec vs `src/`

Spec: [ui-kit-spec.md](./ui-kit-spec.md). Paths relative to `src/`. Read-only analysis, 2026-10-22.

Global facts: `style.css` forces radius 0 (`!important`), so `rounded-*` is inert. `label-mono` is 12/16
(kit mono label is 12/1). `meta-mono` is 11.5/400/ink-3. App uses ad-hoc `label-mono text-[11px]` where the kit
asks for 11.5 or 12. App hotkeys today: transport, ⌘↵ (editor), Esc (Ask AI) only.

## WU1 — Button, Kbd, Tag, Switch, Admonition, NavTabs
- **Button** `components/ui/button/index.ts:6-31`: heights xs h-6/sm h-7/default h-8/lg h-9 → kit sm30/md36/lg40/touch48;
  padding px-2.5 everywhere → `0 9px` secondary, `0 12px` others; gap-1.5/gap-1 → 5; `disabled:opacity-50` → .35;
  transition default easing → `--ease-out`; secondary `bg-secondary` → transparent, hover hover-row; primary
  `hover:bg-primary/85` → none; no `pressed` variant → hover-row + 1px ink border; no `hotkey` prop (callers add
  `<Kbd>` by hand, editor-card.vue:51, transport-bar.vue:140) → `[k]` before label, ink-3 (primary inherit .75).
  Keep `ghost`, `link`, `icon*`.
- **Kbd** `components/ui/kbd/Kbd.vue:13`: `text-[11.5px] font-normal` → mono label 12/500/+.02em; inverse = inherit .75.
- **Tag/Badge** `components/ui/badge/index.ts:6-21`: default is filled `bg-primary`, `h-5 px-1 py-0.5 border` → text
  only, 500 11.5/1 mono uppercase; add concept-hue / muted / now (brand-text) tones. Ad-hoc 11px tags:
  queue-list.vue:57, web-api-timer-card.vue:26, panel-skin.css:96.
- **Switch** `components/ui/switch/Switch.vue:32-42`: shadcn track/thumb → text button role=switch, h36, gap 6,
  `0 8px`, mono label + `ON` console green / `OFF` ink-3; disabled .35. Used in ask-ai-settings.vue:69; dock uses a
  Toggle "Autostart" (transport-bar.vue:173).
- **NavTabs**: none exists. Header uses ToggleGroup sm (app-header.vue:56-74); phone ModeTabs h-11 (mode-tabs.vue:28).
- **Admonition/Alert** `components/ui/alert/*`: `border-l-2` → `inset 2px 0 0 <hue>`; `px-3 py-2` → `10px 12px`;
  gap → 16; AlertTitle label-mono 12/16 + lucide icon column → mono 500 11.5/14 `<glyph> <LABEL>` in hue;
  description text-sm → Inter 13.5/21 ink-2; AlertAction absolute → in-flow mono 12/20 underlined; tones only
  default/destructive (halt hand-patched in halt-banner.vue:17) → note/halt/error/syntax/success/prompt; role=alert
  hard-coded → only error/syntax.

## WU2 — Dialog, TextField, Select, PromptInput
- **Dialog** `components/ui/dialog/*`: `sm:max-w-sm` (settings `sm:max-w-md`) → 500; `grid gap-4 p-4` → header 44
  (`0 20px`, bottom line, mono label title, `[ESC]CLOSE` word) / body p20 gap20 / footer min-h 60 gap 6 `0 20px`
  top line; X icon close → word; drop zoom-in-95. Scrim/centring already match.
- **TextField**: none. Label.vue:19 Inter text-sm → mono 500 11.5/14 ink-3; Input.vue:25 h-8 transparent Inter →
  h40, 1px line (error 1px error), bg, mono 13 `0 12`; Eye icons → `SHOW`; add `⚠ error` mono 12/16 + helper Inter 13/20.
- **Select** `components/ui/select/*`: trigger h-8/h-7 text-xs uppercase → h40 mono 13, open = 1px ink border,
  ChevronDown → `▾` ink-3; items `py-1 pr-8 pl-1.5 text-sm` + CheckIcon → mono 13/34, `0 12`, line-soft dividers,
  selected hover-row + inset brand rule, no icon.
- **PromptInput**: none (ask-ai-composer.vue uses Textarea + SendIcon).
- Other primitives with lucide: SelectScroll* chevrons → `▾`/`▴`; Checkbox/DropdownMenu/CommandItem Check → `✓`;
  Dialog/Sheet X → `[ESC]CLOSE`; CommandInput Search → `❯`; DropdownMenuSubTrigger ChevronRight → `→`.

## WU3 — Shell, header, dock, scrubber, caption, Why rail, trace rows
- **Header** app-header.vue:47-109, App.vue:146-148: wrapper `px-4 pt-3`, `min-h-12 flex-wrap` → h48 `0 20px` gap 28
  stretch; title semibold + brand square → Inter 500 16/1 -0.01em; tagline → `CHROME 155 MODEL`; no desktop mode tabs
  → `[E]EDIT` `[R]REPLAY · RUN #n`; ToggleGroup views → NavTabs `[1]PANELS [2]DIAGRAM [3]3D SCENE`; no divider;
  language Select → `[L]EN/VI`; theme Select (system/light/dark + icons) → `[T]DARK`; share ghost → `[S]SHARE`
  (keep popover); no `KEYS ON`.
- **Main grid** use-app-layout.ts:17-20: hard-coded px → `var(--col-*)`; App.vue:144 `max-w-[1440px] mx-auto` +
  `border-y` → full bleed.
- **Dock** App.vue:208-219, transport-bar.vue:102-186: bg-raised, no top line → bg + top line, h92; row 1 38px
  `0 20` gap 16, opacity .4 without Trace; step mono label tabular min-w 132; clock mono 12 ink-3; row 2 `0 12` gap 2
  top line-soft; transport ghost sm → lg secondary with hotkey prop; "Prev"/"Next" → `STEP`; play primary lg;
  caption line meta-mono "▸ #seq k" → Inter 13 ink-2 caption, empty "No Trace yet — press Run"; Toggle Autostart →
  Switch `AUTO-PLAY`; add 1px×28 divider; Ask AI outline sm → lg `[A]ASK AI` (pressed when open). Keep ⌥ Task,
  Start/End, SPEED, tour segment.
- **Scrubber** timeline-scrubber.vue:48-76, Slider.vue:26-55: track 4px bg-raised + inset line-soft; fill
  `bg-brand/50` → ink-2 .55; thumb 4×24 → 2×24 brand + `0 0 0 2px bg` halo + left transition --motion-line; task/job
  → 3px lanes under track; output ticks 2×5 at top (console, error only). Keep clickable markers.
- **Caption** step-caption.vue:89-114: `px-4 py-3 gap-2` → `16 20` gap 12 bottom line; meta row → mono label gap
  16 with `LINE l` brand-text, spacer, `VIRTUAL CLOCK` ink-3 + value ink; sentence add -0.01em, min-h 56,
  text-wrap pretty; ids `Task #n`/`Job #n`/`Timer #n` mono .92em in hue. PhaseStrip (:98-108): gap-x-1 → 10,
  text-[11px] → 12, arrows ink-4, now `5px 7px` + `inset 0 -1px 0 hue`, halt + `inset 0 -1px 0 brand`.
- **Why rail** why-rail.vue:23-43, event-detail.vue:41-77: head `16 20 18` gap 12 bottom line, `WHY` · spacer ·
  `TRACE EVENT n`; spec link Inter 13/19 + aria-hidden `↗` span (not CSS content); events header 38px
  `TRACE EVENTS` + count. Keep Spec/Payload/Source/Cause dl.
- **TraceEventRow** event-list.vue:111-133: `flex h-6` (ROW_HEIGHT 24) → grid `44px 44px 1fr` h31
  `0 20px 0 12px` line-soft; n / tag in hue / Inter 13 text; aria-current=step; future ink-3; group headers
  `TICK n · TASK #n — <SOURCE>`; `max-h-80 border` → full-height scroll. Keep filters + Show all.
- **Halt / timing-sensitive** halt-banner.vue, timing-sensitive-badge.vue: lucide → glyph Admonition.

## WU4 — Stage panes, queue items, console, ghost stage
- **Pane** panel-card.vue:48-93: header px-3 + bottom rule → `0 16px`, no rule; count meta-mono → mono label ink-3
  tabular; add Inter 12.5/17 ink-2 subtitles (replace InfoIcon tooltip); body `0 16px 16px` gap 6; empty slot
  dashed 1px p14 Inter 12.5/17 ink-3 (queue-list.vue:38, web-apis-panel.vue:28); empty texts "Empty — the loop
  can move on" / "No Jobs waiting" / "No Tasks waiting" (en/core-panels.ts:17,36,41).
- **QueueItem** queue-list.vue:40-58, panel-skin.css:48-100, callback-chip.vue:23: one row → two rows (id in hue ·
  kind Inter 12/15 ink-2 · `L#` ink-3 · NEW/TOP tag; then mono 12.5/18 code, no chip box); padding `7px 10px`;
  "running" → `TOP`; add done/ghost state. Keep Web API timer card.
- **Console** console-panel.vue:25-37, console-lines.ts: grid `36px 1fr auto` gap 8 `0 16px`; text prefix "log: " →
  tag column LOG/INF/WRN/ERR/REJ; WRN warn-soft; ERR error-soft (rule only for Uncaught/REJ); "Uncaught (in
  promise)" → `Uncaught ` / `Unhandled rejection ` labels; new line console-soft + inset console; meta column
  (needs source line + task/job — ObservableEntry lacks it); repeat count; pane height 178 (now max-h-72).
- **Stage** replay-stage.vue:51-84: edit mode ghost stage (2×2 + 130px console ghost cells + centre card
  READY/WORKER BUSY/⚠ RUN BLOCKED); keep EventLoopPanel beside console.

## WU5 — Editor pane and Source pane
- **Editor** editor-card.vue:42-85, script-editor.vue:113-174: CardHeader "Code" + Run → 40px header `SCRIPT`
  `EDITING`/`LOCKED WHILE RUNNING` · `EXAMPLE <name> ▾` · `[?]SUPPORTED APIS`; editor card bg-raised line-soft +
  32px `JS · SCRIPT.JS`; gutter 40px right ink-3; in-editor unsupported marks (error colour, wavy, error-soft);
  footer 56px `RUN SETTINGS` · `BUDGET …` · primary lg `[⌘↵]RUN`; running `✻ Recording Trace…` + destructive
  `[ESC]CANCEL` (LoaderCircle now); example picker shows current name; supported-apis popover 340w grouped by hue.
  Unsupported notice → error Admonition `UNSUPPORTED API · RUN BLOCKED`.
- **Source** (same editor-card read-only): Alert "Read-only during replay." → 40px `SOURCE` `READ-ONLY` `[E]EDIT`;
  code card bg-raised mono 12.5/21; current number brand-text; 6×6 queued-concept gutter squares + legend
  `QUEUED WORK THIS LINE CREATED`; footer `RUN #n` + `ENDED NATURALLY`, `N TRACE EVENTS · T TICKS · a → b ms`.
  Current-line fill was avoided for contrast (flag). Keep cause range highlight.

## WU6 — Ask AI panel and settings (`renderer/ai/*`)
- Panel bg-background → bg-panel; header icons (Sparkles/Trash2/Settings/Minus) → 40px `ASK AI` `INTERVIEW COACH` ·
  `SETTINGS` · `[ESC]CLOSE`; Badge "Whole Run · n steps" → `CONTEXT · RUN #n · STEP n OF N` mono 11/14; body p16
  gap16; user turn `10 12` mono 13/20 brand `❯`; answer concept ids mono in hue; recap → success Admonition
  `INTERVIEW ONE-LINER`; composer → PromptInput + hint `<model> · YOUR OPENROUTER KEY`.
- Settings: title `ASK AI SETTINGS`; TextField `OPENROUTER API KEY` + SHOW + helper; Select `MODEL`; footer
  `REMOVE KEY` (error) · `CANCEL` · `[↵]SAVE` (app applies edits immediately — flag); `[ESC]CLOSE`.
- Lucide everywhere in ai/* → words/glyphs. Keep empty state, error alert, tour, minimize, mobile sheet.

## User decisions (2026-10-22)
- Theme: `[T]DARK`/`[T]LIGHT` two-state toggle exactly like the kit; drop the "system" option (default dark).
- Ask AI settings: Save/Cancel — edits are a draft, applied only on `[↵]SAVE`; `CANCEL`/Esc discards.
- `[A]ASK AI`: stays enabled without a Trace (keeps the app's "asking runs the Script" behaviour).
- In scope now: extra hotkeys E/R/1/2/3/L/T/S/A/? + `KEYS ON/OFF` header toggle (hides printed hotkeys);
  ghost stage in edit mode; Source pane gutter squares + run footer; console meta column (`L3 · JOB #1`),
  which needs the Trace/observable output to carry source line + Task/Job per console entry.

## Order
WU1 ∥ WU2 first. Then WU3–WU6 in parallel. WU3 owns App.vue; WU4/WU5 state new props they need.
