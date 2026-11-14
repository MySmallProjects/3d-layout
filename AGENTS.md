# Standing rules for the agent

Read this file and /docs/SPEC.md at the start of EVERY session.

## Process
- Work on ONE phase at a time. Do not start the next phase until the user says so.
- Before coding a phase, write a short plan and list the files you will create or change. Wait for approval if this is the first phase or if the plan changes the architecture.
- Read only the current phase file (/docs/phase-N.md) plus SPEC.md. Do not implement features from other phases early.
- After each phase the project must install, build and run with no errors. Fix errors before declaring the phase done.
- Verify the phase's features yourself in the browser where possible, then list what the user should test manually.
- Commit to git at the end of each phase with a clear message.
- Tick completed items in /docs/TASKS.md. At the end of each phase, list anything you skipped, simplified or are unsure about. Never silently drop a requirement.

## Code quality
- Pin exact dependency versions in package.json (no ^ or ~).
- Before using any library API, check that library's CURRENT documentation. Do not rely on memory. This matters especially for: three.js, @react-three/fiber, @react-three/drei, three-gpu-pathtracer, @gltf-transform/*, and SQLite bindings.
- TypeScript strict mode. Shared types live in /shared/types.
- Keep each file under ~300 lines; split into modules.
- Comment non-obvious code. Prefer simple, readable solutions.
- Keyboard shortcuts must be defined in ONE shortcuts definition file, used by both the key handlers and the Help page.

## Safety
- NEVER delete, overwrite or reset the /data directory except through the Admin reset/restore features once they exist.
- Do not add authentication yet, but keep routes structured (e.g. /api/admin/*) so it can be added later.
- Do not run destructive commands (rm -rf, git reset --hard, force push) without asking.
- All file paths from user input (uploads, restores, zip entries) must be sanitised to prevent path traversal.

## Scope decisions already made
- GLB only. No .vox support.
- Meshopt only for compression. No Draco.
- The path tracer is a stretch goal inside Phase 6. Deliver the standard high-quality renderer first.
