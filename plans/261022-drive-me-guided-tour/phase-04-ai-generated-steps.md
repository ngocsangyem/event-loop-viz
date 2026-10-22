# Phase 4: AI-generated steps for custom Scripts

## Overview
Priority: medium · Status: code done (tests written, not run; never called a real model) · Depends on: phase 1 (types), phase 2 (session)

## Requirements
- **A separate flow from the Ask AI chat:** no chat messages and no panel. It reuses only the low-level pieces:
  - `openrouter-client.ts` `streamChat`
  - `api-key-store.ts`
  - the model choice
  - `build-run-context.ts` (the Trace summary the model may see)
- **Drive-specific system prompt:** the model returns **JSON only**, in this shape:
  `{ "steps": [{ "seq": <Trace event seq>, "target": <one of DriveTarget>, "line"?: n, "title": "...", "body": "..." }] }`
  - Language: the UI locale.
  - Vocabulary: GLOSSARY terms, and the same writing rules as `system-prompt.ts`.
- **Validation** (`parse-drive-ai-steps.ts`):
  - Strip code fences and parse the JSON.
  - Drop steps whose `seq` is not in the Trace, or whose target is unknown. An unknown target can be replaced by a fallback derived from the event kind: `console` → console, `job:*` → microtask-queue, `task:*` → task-queue, `timer:*` → web-apis.
  - Sort by position, dedupe positions, and cap at 16 steps (raised from 12 after the accuracy review).
  - Zero valid steps is an error state.
- **UX:**
  - While generating, the popover shows a loading line and can be cancelled (`AbortController`).
  - **Errors:** reuse the error kinds from `openrouter-error.ts`, shown inside the popover.
  - **No API key:** open the existing settings dialog.
- **Cache:** in memory, keyed by (Script, settings, model, locale), so Prev/Next and restarts do not call the AI again.
- **Security:** never log the key or the prompt that contains it. The Script text is sent only after the user clicks DRIVE ME.

## Related code files
- Create:
  - `src/renderer/drive/drive-ai-prompt.ts`
  - `src/renderer/drive/parse-drive-ai-steps.ts`
  - `src/renderer/drive/use-drive-ai-steps.ts`
  - `src/renderer/drive/__tests__/parse-drive-ai-steps.test.ts`
- Modify:
  - `src/renderer/drive/use-drive-session.ts` (the async provider)
  - `src/i18n/messages/{en,vi}/core.ts` (`drive.ai.*`)

## Todo
- [x] Prompt + parser + tests (fences, bad seq, bad target, fallback, cap, empty)
- [x] Composable with abort + cache + key gate
- [x] Loading/error states in the popover

## Success criteria
- Parser tests cover the malformed outputs listed above.
- Cancelling mid-request leaves no state behind.
- No key means no network call.

## Risks
- **Model drift in the JSON shape.** Mitigation: a tolerant parser, plus the kind-based target fallback.

## Implementation notes
- **Files:**
  - `drive-ai-prompt.ts`: the JSON-only system prompt. It reuses Ask AI's `LANGUAGE` rules, now exported from `system-prompt.ts`.
  - `parse-drive-ai-steps.ts`: a tolerant parser with a fallback target per event kind.
  - `drive-ai-steps.ts`: `createDriveAiSteps`, which owns the key gate, model choice and cache.
  - `drive-notice.vue`: the card body for error states.
  - `drive-ai-settings.vue`: wraps the Ask AI settings dialog.
  - `use-drive-me.ts`: tries the curated steps first, then the AI.
- **Key store:** `ai/shared-api-key-store.ts` is a page-wide singleton, used by both Ask AI and Drive me. A key that is not remembered on this device still works in both features for that page load.
- **Error message keys:** `ERROR_KEYS` moved from `ask-ai-error-alert.vue` into `openrouter-error.ts`, so Ask AI and Drive me show the same error messages.
- **Context:** the AI gets `buildRunContext` with the playhead at the Run's last step. The prompt tells it to ignore the playhead part.
- **No key:** the settings dialog opens by itself. Saving it calls `session.retry()`, which reloads the steps for the same Trace without running the Script again.
- **`empty` status:** now effectively unreachable, because the AI path throws when it has no usable steps. It is kept as a safe default.
