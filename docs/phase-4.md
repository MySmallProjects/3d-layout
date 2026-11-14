# Phase 4: Scene save/load

Read SPEC.md first. Implement only this phase.

## Goals
1. Backend: scenes table/API (create, list, get, update, rename, delete, duplicate). Scene JSON includes a schemaVersion.
2. Save Scene (Ctrl+S), Save As, Open Scene, New Scene, Duplicate Scene (as a template), Rename, Delete. A scene list dialog with thumbnails (capture a thumbnail from the viewport on save).
3. A saved scene stores: every object instance (library model ID, name, position, rotation, scale, mirror state, visibility, locked, parent/group id), background setting, grid toggle, camera position, lighting setup (placeholder structure for now), render settings (placeholder for now). Reserve fields for ground plane settings and camera bookmarks (used in Phase 7).
4. Missing models: if a referenced library model no longer exists, show a placeholder box and a warning in the scene objects list; do not crash; keep the data so it can be fixed.
5. Show the current scene name and an "unsaved changes" indicator; warn before leaving or opening another scene with unsaved changes.
6. Autosave a draft every 30 seconds to the server (separate from the real save). On startup, if a draft newer than the last save exists, offer to recover it.
7. Export a scene as a JSON file; import a scene JSON file (validate it, handle unknown/missing fields, and handle model IDs that do not exist).
8. Loading a scene restores everything exactly, including camera position and background, and clears undo history.

## Done when
- I can build a scene, save it, reload the page, open it and see identical placement, rotation, scale, mirror, visibility and background.
- Killing the browser tab mid-edit and reopening offers draft recovery.
- Exporting then importing a scene JSON works.
