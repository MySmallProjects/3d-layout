# Phase 6: Lighting, high-quality rendering, render gallery

Read SPEC.md first. Implement 6a and 6c first, and only start 6b (path tracing) when I ask. Use the strongest model available for 6b.

## 6a. Lighting presets and standard high-quality renderer
1. Lighting preset system (dropdown). Built-in presets: Studio three-point, Soft box, Outdoor daylight, Golden hour, Overcast, Night/moody, Product turntable (white cove), Flat/unlit.
2. Each preset is editable (light intensity, colour, direction/angle sliders, ambient level) and can be saved as a custom preset; custom presets are stored on the server and included in scene saves. HDRI environment support: upload my own HDRIs (.hdr/.exr), stored on the server, selectable as environment and optionally as background.
3. In edit mode the lighting preview stays simple and cheap; full quality only in render mode.
4. "Render" toolbar button opens a settings dialog: resolution (1080p, 4K, square, custom), anti-aliasing/sample level, camera FOV, depth of field (aperture, focus distance, click an object to set focus), transparent background (PNG), exposure, tone mapping, lighting preset, ground plane/shadow options (basic for now).
5. Standard high-quality renderer: WebGLRenderer with high-resolution shadows, SSAO (or similar), anti-aliasing (supersampling or accumulation), proper tone mapping, rendered offscreen at the requested resolution (handle GPU max texture/canvas size limits with clear errors). Progress bar and cancel.
6. On completion, upload the PNG to the server automatically with metadata (timestamp, scene name/id, all settings, camera).

## 6b. Path tracing (stretch goal; separate step)
1. Add progressive path tracing using three-gpu-pathtracer (check its current docs and the three.js version compatibility before installing).
2. Settings: samples, bounces, plus existing camera/DOF/exposure options. Progress bar showing samples accumulated, cancel button.
3. Choose renderer in the render dialog: "Fast (standard)" or "Path traced". If path tracing is unsupported or fails, fall back to the standard renderer with a clear message.
4. Make sure the 10MB-class GLBs and multiple instances load into the path tracer without running out of memory; report clear errors if they do.

## 6c. Render gallery
1. A Renders page showing a grid of saved renders with thumbnails.
2. Click for full-size view with the settings used; download; rename; delete.
3. "Open the scene that made this render" and "Re-render with the same settings".
4. Sort by date; filter by scene.
5. Backups (Phase 5) must include renders and presets: verify they still do.

## Done when
- I can pick a lighting preset, tweak it, save it as custom, render at 1080p and 4K, see the result appear in the gallery, download it, and re-render from it.
- (6b) Path-traced render works on my machine or falls back gracefully.
