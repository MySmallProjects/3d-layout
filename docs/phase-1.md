# Phase 1: Scaffold, versioning, backend, library

Read SPEC.md first. Implement only this phase.

## Goals
1. Project scaffold: client (React + TS + Vite), server (Node + Express/Fastify + SQLite), shared/types. One command to run both in dev. Dockerfile + docker-compose with /data volume. README.
2. Versioning script and version display exactly as described in SPEC.md. About popup (Help and Admin links can point to placeholder pages for now).
3. Backend API (REST) for the asset library:
   - Upload one or many .glb files (multipart), validated by type and configurable max size.
   - List models, rename model, move model to folder, delete model (removes file and thumbnail).
   - Create, rename, delete folders; nested folders; define what happens to contents when a folder is deleted (ask in the plan; sensible default: refuse unless empty, or move contents to parent).
   - Serve model files and thumbnails.
   - Sanitise filenames; store files under /data with generated IDs, keep original name as the display name.
4. Library panel (left sidebar):
   - Upload via button or drag-and-drop onto the panel; multiple files; progress indicator.
   - Folder tree with expand/collapse, thumbnails grid or list for models in the selected folder.
   - Rename (double-click or context menu), delete with confirmation, create/rename/delete folders.
   - Move models via drag-and-drop onto folders and a "Move to..." context menu.
   - Search box filtering by name.
5. Thumbnails: after upload, the client renders each model offscreen (three.js, neutral lighting, auto-framed camera), uploads the PNG to the server, which stores it. Show a placeholder until ready. Provide a way to regenerate a thumbnail.
6. Register the Meshopt decoder in the GLB loader now, so compressed files work later.

## Done when
- `npm install` and the dev command work from a clean checkout; docker-compose builds and runs.
- I can upload several 10MB GLBs, see thumbnails, rename, make nested folders, drag models between folders, search, and delete. Everything survives a server restart.
- Version label shows in the corner and increments after a build.
- Invalid uploads (wrong type, too large) show a clear error.
