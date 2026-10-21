# Warm Terminal — extracted for the Event Loop Visualizer

Source: the pasted "claude.dev warm terminal" design guide (2026-10-10). Its values
are copied as written below. The app-specific additions are marked **[app]**.

## Rules carried over
- Cream page / near-black dark. One orange accent, used sparingly. ANSI hues mean things.
- Inter (400/500/600) for titles, prose and values. JetBrains Mono (400/500) for every label, nav item, hotkey, id, number and code. Only mono text is uppercase; titles are lowercase.
- Surfaces are flat. Depth comes from tone steps (bg → bg-raised → bg-panel) and 1px lines. **Radius 0. No shadows.**
- Hotkeys are printed in the UI (`[E]EDIT`, `[␣]PLAY`). They never fire while typing or with a modifier, and a visible `KEYS ON/OFF` toggle turns them off.
- Controls are words, not icons (PLAY, STEP, SHARE, COPY). No pill buttons. Hover is a colour step or row fill, never a lift.
- Terminal glyphs only where they mean something: `❯` prompt (AI input), `▲ ⚠ ↯ ※ ✓` on admonitions, `↗` on external links.
- Admonitions: mono label plus a 2px left hairline in the ANSI hue; the body stays ink-2.
- Motion is a status signal: opacity + transform only, ≤4px travel, terminal parts step (`steps(1,end)`).

## Tokens (hex, from the guide)
| Role | Light | Dark |
|---|---|---|
| bg | #faf9f5 | #141413 |
| bg-raised | #f1efe8 | #1a1a18 |
| bg-panel | #ece9e0 | #1e1d1b |
| ink | #141413 | #faf9f5 |
| ink-2 | #4c4b45 | #b0aea5 |
| ink-3 | #65645e | #87867f |
| ink-4 (decorative only) | #a8a69d | #5e5d59 |
| line | #14141338 | #faf9f529 |
| line-soft | #1414131c | #faf9f517 |
| hover-row | #1414130d | #faf9f50b |
| accent (non-text) | #c15f3c | #d97757 |
| accent-text | #a94e2f | #d97757 |
| ansi blue / cyan / green | #2a60d6 / #156f93 / #537126 | #82aaff / #89ddff / #c3e88d |
| ansi magenta / yellow / red | #8c46bb / #7a5d00 / #a04545 | #c792ea / #e5c07b / #e08f8f |

Motion: instant 0 · tick 20ms · line 90ms · fast 120ms · base 180ms · slow 280ms · spinner frame 110ms;
ease-out cubic-bezier(.19,1,.22,1) · ease-swift cubic-bezier(.55,0,.1,1) · ease-term steps(1,end).

## shadcn-vue mapping [app]
background=bg · foreground=ink · card=bg · popover=bg-panel · primary=ink · primary-foreground=bg ·
secondary=bg-raised · muted=bg-raised · muted-foreground=ink-3 · accent=hover-row · accent-foreground=ink ·
border=line · input=line · ring=accent · destructive=ansi-red · radius=0 ·
chart-1..5 = ansi yellow, magenta, blue, cyan, green.
Extra: `--foreground-2` (ink-2), `--border-soft` (line-soft), `--brand` / `--brand-text` (the orange accent).

## Concept colours [app]
Accent orange means **now**: the playhead, the current Source line, the active Trace Event, focus, Halt.
- Call Stack → ansi yellow · `STACK`
- Microtask Queue / Job → ansi magenta · `JOB`
- Task Queue / Task → ansi blue · `TASK`
- Web APIs / timers → ansi cyan · `TIMER`
- Console → ansi green · `LOG`
- Errors, rejections, blocked Runs (Unsupported API, SyntaxError) → ansi red · `ERR`
Every hue comes with a mono tag, so colour is never the only signal.

## Deviations [app]
- Mono labels inside panes use the 12px caption size (the app is denser than the blog's 13px labels).
- One motion exception: an item travelling between lanes during replay (≤280ms, ease-swift). It is replayed state, not decoration, and reduced motion turns it off.
- Syntax colours follow vitesse-light/dark, with light string re-solved to #9a5a4a for AA. Concept APIs (setTimeout, Promise/then, queueMicrotask, console) use their concept hue.
