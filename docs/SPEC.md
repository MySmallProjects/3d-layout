# Project spec: 3D Scene Composer

A self-hosted web app for composing 3D scenes from a personal library of GLB models and rendering high-quality images of them. Single user, no auth (yet). GLB files only.

The build is split into phases (see phase-1.md to phase-8.md). This file holds what applies across all phases.

## Tech stack
- Frontend: React + TypeScript + Vite, three.js (via @react-three/fiber and drei is fine), Zustand for state.
- Loader: GLTFLoader for .glb, with the Meshopt decoder registered so compressed files load.
- Backend: Node.js + Express (or Fastify) with SQLite for metadata.
- Storage: all user data lives under one /data directory: models, thumbnails, backgrounds, HDRIs, renders, scenes, settings, SQLite DB.
- Folders: client/, server/, shared/types, docs/.
- Provide a README with setup instructions, and a Dockerfile + docker-compose with /data as a mounted volume.
- Single-user, no auth now, but structure the code so auth could be added later.

## UI layout
Dark UI in the style of a typical 3D editor:
- Top: toolbar (scene menu, transform mode, snapping, grid toggle, render button, help, admin link).
- Left: asset library panel (folders, thumbnails, search).
- Centre: 3D viewport.
- Right: properties panel (selected object), and scene objects list with thumbnails.
- Small version label bottom-right.
Desktop-first. Touch support optional.

## Data model (outline; refine in Phase 1)
- Model: id, name, folderId, filePath, thumbnailPath, sizeBytes, createdAt, normalisation settings (later phase), original file path if optimised (later phase).
- Folder: id, name, parentId.
- Scene: id, name, thumbnailPath, createdAt, updatedAt, data (JSON, see below).
- Render: id, name, sceneId, filePath, thumbnailPath, createdAt, settings (JSON), cameraName (optional).
- Background / HDRI / LightingPreset / Settings records.

Scene JSON stores: every object instance (library model ID, name, position, rotation, scale, mirror state, visibility, locked, parent/group id), background setting, grid toggle, ground plane settings, camera position, camera bookmarks, lighting setup, render settings. Include a schemaVersion field so old scenes can be migrated.

## Global requirements
- Models are about 10MB each, so show loading indicators and handle load errors with clear messages.
- Upload validation: type (.glb only), configurable size limit (default allows at least 100MB).
- Missing models in a scene show a placeholder and a warning rather than crashing.
- Editing uses a fast low-quality renderer; high-quality rendering only happens on demand.
- Every API error returns a clear message; the UI shows it.

## Versioning (built in Phase 1)
- A prebuild script runs before every build, increments a build number stored in a committed file (e.g. version.json) and records the build date/time.
- Vite injects the version at build time (`define` or import.meta.env).
- UI shows it small, bottom-right, like "v1.0.42 · 2026-11-14 18:30". Clicking opens an About popup with version, build date and links to Help and Admin.
- In dev mode show "dev" plus the current timestamp.
- Server exposes GET /api/version. Backups record the version.
- Docker note: version.json must be in the source tree and committed so the counter does not reset each image build.

## Keyboard shortcuts (single source of truth)
Camera: F focus selected; Home reset view.
Selection: click select; Shift+click multi-select; click empty = deselect; Esc deselect; Delete remove.
Transform: W move; E rotate; R scale.
Arrow keys (selected object): Left/Right = X; Up/Down = Z (relative to camera view, Up moves away from viewer); PageUp/PageDown = Y. Step = snap grid size; Shift larger; Alt finer. Inactive while typing in inputs.
Scene: G toggle grid; Ctrl+D duplicate; Ctrl+Z undo; Ctrl+Shift+Z redo; Ctrl+S save; Ctrl+G group; Ctrl+Shift+G ungroup.
General: ? help.
