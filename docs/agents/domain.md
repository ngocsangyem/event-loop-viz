# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root: the project's domain vocabulary.
- **The code itself** for design decisions. This repo keeps no ADRs: the codebase is the only source of truth, and comments next to the code explain the reasons that matter.

If `GLOSSARY.md` doesn't exist, **proceed silently**. Don't flag its absence; don't suggest creating it upfront. The `/domain-modeling` skill creates it lazily when terms actually get resolved.

## Do not write ADRs

Don't create `docs/adr/` or decision records. When a decision needs explaining, put the reason in a comment next to the code it shapes, or in the commit message.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).
