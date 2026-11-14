# 3D Scene Composer

A self-hosted web app for composing 3D scenes from a personal library of GLB models and rendering high-quality images.

## Features (Phase 1)
- **Asset Library Management**: Upload single or multiple `.glb` models (up to 100MB+ configurable limit).
- **Nested Folder Structure**: Organize models into hierarchical folders, move models between folders via drag-and-drop or context menu, and rename/delete folders.
- **Offscreen Thumbnail Generation**: Automatic client-side rendering with neutral studio lighting and auto-framed camera angles using Three.js.
- **Meshopt Compression Ready**: `MeshoptDecoder` registered on `GLTFLoader` from day one for compact models.
- **Versioning**: Build counter in `version.json` incremented automatically before every build and displayed in the bottom-right corner with an About dialog.
- **Persistent Storage**: All user data resides under `/data` (models, thumbnails, SQLite database).

---

## Getting Started

### Prerequisites
- Node.js (v20 or v22 LTS) and npm
- Or Docker & Docker Compose

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```

2. **Run both server and client concurrently:**
   ```bash
   npm run dev
   ```
   - Client: http://localhost:3000
   - Server: http://localhost:3001

3. **Build for production:**
   ```bash
   npm run build
   npm run start
   ```

### Running with Docker

Run with persistent storage mounted to `./data`:

```bash
docker compose up --build
```
Access the application at `http://localhost:3001`.

---

## Data Directory Structure (`/data`)

```
data/
├── models/             # Stored .glb binary files (UUID-named)
├── thumbnails/         # Stored .png model preview thumbnails
└── database.sqlite     # SQLite database for folders, models, metadata
```

> **Important**: Never delete or overwrite `/data` directly. Backups and restores are managed through the application.

---

## Keyboard Shortcuts

- `?` : Open Help and Keyboard Shortcuts modal
- `W` / `E` / `R` : Translate / Rotate / Scale mode (Phase 3)
- `F` : Focus selected object (Phase 2)
- `Home` : Reset camera view (Phase 2)
- `G` : Toggle grid (Phase 2)
