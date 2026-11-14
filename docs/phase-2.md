# Phase 2: Viewport and scene basics

Read SPEC.md first. Implement only this phase.

## Goals
1. 3D viewport in the centre using the fast "edit mode" renderer: capped pixel ratio, simple lighting (ambient + directional or hemisphere), no post-processing, no or very simple shadows.
2. Drag a model from the library into the viewport: adds an instance dropped at the floor-plane point under the cursor (origin if the raycast fails). The same model can be added many times; each instance is independent with its own ID and name.
3. Multiple objects in the scene, each independently selectable by clicking. Click empty space to deselect. Shift+click for multi-select (selection state only; group transforms come in Phase 3).
4. Orbit camera: left-drag orbit, right-drag pan, wheel zoom. F focuses the selected object; Home or a toolbar button resets the view.
5. Grid floor: standard infinite-style grid, toggled by a toolbar button and the G key.
6. Background: upload a background image and set it; or pick a solid colour; or clear it. Uploaded backgrounds are stored on the server and listed so they can be reused. Optional: equirectangular mode that also lights the scene.
7. Outline highlight: subtle outline on hover, stronger outline on selected objects.
8. Scene objects list panel (right sidebar):
   - One row per object showing the library thumbnail, name, visibility toggle and lock toggle.
   - Click selects in the viewport; selecting in the viewport highlights the row; double-click focuses the camera.
   - Rename, delete and duplicate from the row (context menu or buttons).
   - Locked objects cannot be selected or moved in the viewport.
9. Scene state lives in a Zustand store with a clean, serialisable shape (this will be saved in Phase 4 and used for undo/redo in Phase 3).
10. Loading indicator while a dropped model loads; clear error and a placeholder box if it fails.

## Done when
- I can drag several models from the library into the scene, including the same model more than once, select them from the viewport or the list, hide/lock/rename/delete/duplicate them, toggle the grid with G, and set a background image.
- Hover outline works and orbit/pan/zoom feel smooth with 10+ models of ~10MB each.
