# Prompts to paste into Antigravity

## 1. First session (paste this first)

```
Read /AGENTS.md, /docs/SPEC.md and /docs/phase-1.md. Do not write code yet.
Summarise your understanding in 10 bullets, list any ambiguities or risks,
and propose the folder structure and the main dependencies with versions
(checked against current docs). Wait for my approval.
```

## 2. Starting each phase (change the number)

```
Read /AGENTS.md, /docs/SPEC.md and /docs/phase-N.md. Write a short plan and
list the files you'll create or change. Then implement ONLY phase N. When
finished: make sure it installs, builds and runs; verify the features in the
browser; tick /docs/TASKS.md; commit to git; and give me a list of what I
should test and anything you skipped or simplified.
```

## 3. If something is broken

```
Phase N has this problem: <describe it, paste any error text>.
Find the root cause before changing code, explain it briefly, then fix it.
Do not change unrelated features.
```

## 4. Suggested model use
Use the strongest model available for: Phase 5 (backup/restore/reset),
Phase 6b (path tracing), and the undo/redo and group-transform parts of
Phases 3 and 7. A fast model is fine for the rest.
