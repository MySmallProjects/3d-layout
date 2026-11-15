# Task checklist
The agent ticks items as completed, and lists any skipped or simplified items under each phase.

## Phase 1: Scaffold, versioning, backend, library
- [x] Scaffold client/server/shared, dev command, Docker, README
- [x] Versioning script + version label + About popup + /api/version
- [x] Upload API with validation (multi-file)
- [x] Model rename / move / delete API
- [x] Folder create / rename / delete (nested) API
- [x] Library panel UI with drag-and-drop upload
- [x] Rename, delete, move (drag and "Move to...") in UI
- [x] Search filter
- [x] Thumbnail generation and storage
- [x] Meshopt decoder registered
- Skipped/simplified:
  - Docker daemon socket (/var/run/docker.sock) is unprivileged in this sandbox environment; Dockerfile and docker-compose.yml were verified syntactically and structured for standard volume-mounted deployments.
  - Browser verification subagent could not connect to Chrome due to absent Chrome DevTools port in this headless sandbox; comprehensive integration and HTTP/API end-to-end tests were performed to verify the full workflow.

## Phase 2: Viewport and scene basics
- [x] Fast edit-mode viewport
- [x] Drag from library onto floor point
- [x] Multiple independent instances
- [x] Selection, multi-select, deselect
- [x] Orbit/pan/zoom, focus (F), reset view
- [x] Grid toggle (G)
- [x] Background image / colour / clear (stored on server)
- [x] Hover and selected outlines
- [x] Scene objects list with thumbnails, visibility, lock, rename, delete, duplicate
- [x] Zustand scene store (serialisable)
- [x] Loading indicators and load-failure placeholder
- Skipped/simplified:
  - Bounding box outline helper is used for edit-mode hover and selection outlines to avoid expensive full-screen post-processing passes during real-time multi-model editing.

## Phase 3: Manipulation, properties, undo/redo, help
- [x] Transform gizmo (W/E/R)
- [x] Arrow-key movement (X, Z camera-relative, PageUp/Down for Y; Shift/Alt steps)
- [x] Snapping (position, rotation, scale)
- [x] Snap to floor
- [x] Mirror X/Y/Z
- [x] Multi-select group transforms
- [x] Duplicate / delete / deselect
- [x] Properties panel with scrub and arrow-key fine adjustment
- [x] Undo/redo for all edits
- [x] Help page from single shortcuts file
- Skipped/simplified:
  - None. All Phase 3 features implemented cleanly.

## Phase 4: Scene save/load
- [x] Scenes API
- [x] Save / Save As / Open / New / Duplicate / Rename / Delete
- [x] Scene list with thumbnails
- [x] Missing model handling
- [x] Unsaved changes indicator and warnings
- [x] Autosave draft + recovery
- [x] JSON export / import
- Skipped/simplified:
  - None. All Phase 4 features implemented cleanly.

## Phase 5: Admin
- [x] Admin page and overview stats
- [x] Backup (consistent DB copy, streamed zip, manifest)
- [x] Restore (validate, temp extract, swap, migrate)
- [x] Reset everything (RESET confirmation)
- [x] Round-trip and malformed-zip tests
- Skipped/simplified:
  - None. All Phase 5 features implemented cleanly.

## Phase 6: Lighting, rendering, gallery
- [x] 6a Lighting presets (built-in, editable, custom, HDRI upload)
- [x] 6a Render settings dialog
- [x] 6a Standard high-quality renderer with progress/cancel
- [x] 6a Auto-upload render with metadata
- [x] 6c Render gallery (view, download, rename, delete, re-open scene, re-render)
- [x] 6c Sort and filter
- [x] 6b Path tracer (stretch) with fallback
- Skipped/simplified:
  - None. All Phase 6 (6a, 6b, 6c) features implemented cleanly.

## Phase 7: Extra features
- [x] 7.1 Import normalisation
- [x] 7.2 Optional GLB optimisation (meshopt, texture resize, WebP) with revert
- [x] 7.3 Camera bookmarks
- [x] 7.4 Batch render
- [x] 7.5 Grouping / parenting
- [ ] 7.6 Snap to surface
- [ ] 7.7 Ground plane options
- Skipped/simplified:

## Phase 8: Polish
- [ ] Review skipped items
- [ ] Performance pass
- [ ] Error handling pass
- [ ] Optional admin password
- [ ] UI polish
- [ ] Tags and recently used
- [ ] Approved nice-to-haves
- [ ] Final README
- Skipped/simplified:
