# Phase 8: Polish

Read SPEC.md first. Pick items in this order and stop for review at the end.

1. Review every item in TASKS.md and fix anything marked skipped or simplified, in agreement with me.
2. Performance pass in edit mode with 20+ 10MB models: reduce draw calls where easy, dispose of unused geometries/textures, cache loaded GLBs and share them between instances of the same model.
3. Error handling pass: network failures, server restarts, failed uploads, corrupt GLBs, GPU context loss. Every failure shows a clear message.
4. Optional simple admin password (environment variable) protecting /admin and the /api/admin/* routes. Document it in the README.
5. UI polish: consistent dark theme, panel resizing and collapse, tooltips with shortcuts, empty states, loading skeletons.
6. Library extras: tags on models, a "recently used" section.
7. Nice-to-haves, only if I approve each: per-object material overrides (colour/roughness/metalness), measurements/ruler tool, export the scene as a combined GLB, turntable animation export.
8. Final README update: setup, Docker, backup advice, data folder layout, shortcuts, known limitations.
