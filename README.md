# 3D Scene Composer

A fast, self-hosted browser-based 3D layout, lighting, and rendering studio for `.glb` assets.

---

## Features

- **Asset Library**: Upload `.glb` files via drag-and-drop or multi-file picker, organize into nested folders, tag models (`#tag`), filter by tag or search query, and quickly access **Recently Used** assets.
- **Scale & Pivot Normalisation**: Automatically normalises imported models to a consistent real-world target size (default `1.0m`) with bottom-center or center pivot, plus per-model re-normalisation.
- **Meshopt & WebP GLB Optimisation**: One-click server-side compression using `@gltf-transform` (Meshopt geometry compression + WebP texture conversion) with non-destructive **Revert to Original GLB**.
- **Interactive 3D Viewport**:
  - Orbit, pan, zoom, focus (`F`), and camera bookmarks.
  - Translate (`W`), Rotate (`E`), and Scale (`R`) gizmos, multi-select (`Shift+Click`), object hierarchy & grouping (`Ctrl+G` / `Ctrl+Shift+G`), mirroring (`X`/`Y`/`Z`), **Drop onto Surface Below** (`D`), and **Snap to Floor** (`Y = 0`).
  - **Per-Object Material Overrides**: Override base colour, roughness, and metalness per scene instance without modifying the library asset.
  - **3D Measurement / Ruler Tool** (`M`): Click any two points on scene geometry or the ground plane to measure 3D distance (`m`, `ΔX`, `ΔY`, `ΔZ`).
- **Studio Lighting, Backgrounds & Ground Plane**:
  - Built-in lighting presets (Neutral Studio, Warm Indoor, Sunset, Dramatic, Outdoor Overcast) plus custom sun azimuth/elevation, ambient light, and exposure.
  - Custom `.hdr` / `.exr` environment maps for image-based lighting (IBL).
  - Solid, gradient, custom image, or HDRI backgrounds.
  - Configurable ground plane: **Shadow Catcher** (transparent floor catching shadows), **Solid Colour**, or **Procedural Textures** (Grid, Asphalt, Grass, Concrete, Wood Planks) with reflection and roughness controls.
- **High-Quality Still & Turntable Rendering**:
  - **Fast (Standard) Renderer**: Multi-pass accumulation super-sampling (`4×`/`8×`/`16×`) with optional SSAO, Depth of Field, Bloom, Vignette, Chromatic Aberration, Film Grain, and Sharpen post-processing.
  - **GPU Path Tracer (Experimental)**: Physically-based global illumination via `three-gpu-pathtracer` with live progressive sample accumulation and shadow-catcher compositing.
  - **Render Gallery**: Persistent gallery storing rendered PNGs alongside full scene/camera/lighting metadata, side-by-side comparison, and one-click **Re-open Scene**.
  - **Exports**: Scene JSON export/import, **Combined Scene `.glb` Export**, and **360° Turntable `.webm` Video Export**.
- **Admin, Backup & Restore**: Storage breakdown, full `.zip` backup download, pre-flight archive validation & restore, bulk GLB optimisation, and optional `ADMIN_PASSWORD` protection.

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js** 20+ and **npm** 10+

### Install & Run
```bash
# 1. Install root, server, and client dependencies
npm install
npm --prefix server install
npm --prefix client install

# 2. Start both backend (port 3001) and Vite dev server (port 5173)
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build & Run
```bash
npm run build
npm start
```
In production (`NODE_ENV=production`), the Express server serves both the API and the compiled frontend on `http://localhost:3001`.

### Run Automated Tests
```bash
DATA_DIR=/tmp/3d-layout-test-data npm test
```

---

## Docker Deployment

The application is packaged as a single container with a single persistent `/app/data` volume.

```bash
# Build and start in the background
docker compose up -d --build
```
The app will be available at `http://localhost:3001` and all state is persisted in `./data` on the host.

### Incrementing Build Number for Releases
```bash
./scripts/bump-build.sh
docker compose up -d --build
```

---

## Environment Variables & Admin Password

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | HTTP port for the Express server |
| `DATA_DIR` | `./data` | Path to the persistent data directory |
| `NODE_ENV` | `development` | Set to `production` to serve built static frontend assets |
| `ADMIN_PASSWORD` | *(unset)* | Optional password protecting `/admin` and all `/api/admin/*` routes |

### Enabling Admin Password Protection
Set `ADMIN_PASSWORD` in your environment or `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - PORT=3001
  - DATA_DIR=/app/data
  - ADMIN_PASSWORD=your-secret-password
```
When `ADMIN_PASSWORD` is set:
- Navigating to `/admin` prompts for the password before showing system stats, backup/restore, or reset controls.
- All `/api/admin/*` endpoints (except `/api/admin/auth-status` and `/api/admin/auth-verify`) require the `X-Admin-Password` header (or `?adminPassword=` query parameter for direct backup downloads) and return `401 Unauthorized` otherwise.

---

## `/data` Folder Layout & Backup Advice

All application state lives inside a single directory (`/data` locally or `/app/data` in Docker):

```text
data/
├── db.sqlite          # SQLite database (WAL mode): models, folders, scenes, settings, hdris, renders
├── models/            # Uploaded & Meshopt-optimised .glb files (+ .orig.glb backups for revert)
├── thumbnails/        # Generated PNG thumbnails for models & saved scenes
├── backgrounds/       # Uploaded 2D background images
├── hdris/             # Uploaded .hdr / .exr environment maps
└── renders/           # Full-resolution rendered PNGs and gallery thumbnails
```

### Backup & Upgrade Advice
1. **Built-in Admin Backup (Recommended)**: Open **Admin (`/admin`) → Download Full Backup (.zip)**. Each backup includes `manifest.json` (with app version, schema version, and SHA-256 checksums for every file), a clean SQLite snapshot, and all asset directories.
2. **Restoring**: Upload any backup `.zip` in **Admin → Restore from Backup**. The server validates all checksums and schema compatibility before replacing `/data`, and automatically runs forward database migrations if the backup came from an older schema version.
3. **Host-level Snapshot**: Because SQLite runs in WAL mode, prefer using the Admin Backup button while the server is running, or stop the container (`docker compose stop`) before copying `./data` directly.

---

## Keyboard Shortcuts

All shortcuts are defined in [`client/src/constants/shortcuts.ts`](file:///home/user/git/3d-layout/client/src/constants/shortcuts.ts) and accessible in-app via `?`:

| Category | Shortcut | Action |
| :--- | :--- | :--- |
| **Camera & Mouse** | `Left-drag` | Orbit camera around target |
| | `Right-drag` | Pan camera |
| | `Scroll wheel` | Zoom in / out |
| | `F` | Focus selected object |
| | `Home` | Reset camera view |
| **Selection** | `Click` | Select object (click empty space to deselect) |
| | `Shift + Click` | Multi-select objects |
| | `Esc` | Deselect all |
| | `Delete / Backspace` | Remove selected object(s) |
| **Transform & Tools** | `W` | Translate (move) gizmo |
| | `E` | Rotate gizmo |
| | `R` | Scale gizmo |
| | `D` | Drop selected onto surface below |
| | `M` | Toggle 3D measurement / ruler tool |
| **Arrow Keys** | `Left / Right` | Move along X axis (relative to view) |
| | `Up / Down` | Move along Z axis (away / toward viewer) |
| | `PageUp / PageDown` | Move along Y axis (vertical height) |
| | `Shift + Arrow` | Larger movement step (`4×`) |
| | `Alt + Arrow` | Finer movement step (`0.1×`) |
| **Scene & Hierarchy** | `G` | Toggle grid floor |
| | `Ctrl + D` | Duplicate selected object(s) |
| | `Ctrl + G` | Group selected objects |
| | `Ctrl + Shift + G` | Ungroup selected objects |
| | `Ctrl + Z` | Undo |
| | `Ctrl + Shift + Z` / `Ctrl + Y` | Redo |
| | `Ctrl + S` | Save current scene |
| | `?` | Open Help & Shortcuts modal |

---

## Known Limitations

- **GLB Format Only**: Only binary `.glb` files are supported (no `.gltf` with external sidecar files or `.vox`).
- **Meshopt Compression Only**: Model optimisation uses Meshopt + WebP (`EXT_meshopt_compression` + `EXT_texture_webp`); Draco-compressed GLBs are not supported.
- **Browser WebGL Limits**: Very large scenes (20+ models over 10 MB each) or 4K (`3840×2160`) path-traced renders require sufficient GPU VRAM. If the browser resets the WebGL context, use the on-screen **Restore 3D Viewport** button or switch to the **Fast (Standard)** renderer.
- **Turntable Video Format**: Turntable animations are recorded in-browser via `MediaRecorder` as `.webm` (`VP9`/`VP8`).
