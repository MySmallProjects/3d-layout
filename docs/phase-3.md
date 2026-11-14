# Phase 3: Manipulation, properties, undo/redo, help

Read SPEC.md first. Implement only this phase. Moving objects around must feel intuitive; this is the most important usability phase.

## Goals
1. Transform gizmo (TransformControls) on the selected object with Move / Rotate / Scale modes. Hotkeys W / E / R and toolbar buttons. The gizmo must not trigger orbit controls while dragging.
2. Arrow-key movement of the selected object(s):
   - Left/Right = X axis. Up/Down = Z axis, relative to the current camera view so Up always moves away from the viewer. PageUp/PageDown = Y (height).
   - Step = snap grid size; Shift = larger step; Alt = finer step.
   - Must not fire while typing in any input, and must not conflict with camera controls.
   - Holding a key repeats smoothly; one undo step per key burst, not per tick.
3. Snapping: toggles and configurable values for position (grid size), rotation (default 15 degrees) and scale.
4. "Snap to floor" button: object's bounding-box bottom sits at y=0.
5. Mirror on X, Y or Z (via negative scale, handled so lighting/normals still look correct; verify).
6. Multi-select (Shift+click) with group move/rotate/scale about the selection centre.
7. Duplicate (Ctrl+D), delete (Delete), deselect (Esc).
8. Properties panel (right sidebar) for the selected object:
   - Position X/Y/Z, rotation X/Y/Z in degrees, scale X/Y/Z with lock-uniform toggle, mirror X/Y/Z checkboxes.
   - Live-linked both ways with the gizmo and arrow keys.
   - Drag on a label to scrub the value; arrow keys inside a field adjust it (Shift larger, Alt finer).
   - Show something sensible when multiple objects or none are selected.
9. Undo/redo (Ctrl+Z, Ctrl+Shift+Z) for ALL scene edits: add, delete, duplicate, rename, move, rotate, scale, mirror, visibility, lock. A continuous drag is one undo step. Show undo/redo buttons in the toolbar. Cap history depth sensibly.
10. Help page/modal opened with "?" and from the toolbar: all shortcuts and mouse controls grouped by category, generated from the single shortcuts definition file used by the actual key handlers.

## Done when
- I can place, rotate, scale, mirror and fine-tune objects with gizmo, arrow keys and numeric fields, and undo/redo every one of those actions reliably.
- Help page content matches the real keybindings because both come from the same file.
