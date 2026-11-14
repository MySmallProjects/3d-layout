# Phase 7: Extra features

Read SPEC.md first. This phase has seven independent features. Do them ONE AT A TIME in the order listed, committing after each, and stop for my review after each one. Update TASKS.md after each. Phase 5 backup/restore must keep working with any new data or fields; check this for each feature.

## 7.1 Import normalisation
- On import (and via a "Re-normalise" action), compute the model's bounding box and apply a normalisation: scale so the largest dimension equals a configurable target size (setting, with sensible default), and place the pivot at the centre-bottom of the model.
- Store the normalisation values per model so it can be overridden or disabled per model in the library (context menu or details panel).
- Existing models can be normalised in bulk from a settings or admin action.
- Normalisation must apply consistently when instances are added to scenes; existing saved scenes must not shift unexpectedly (version the behaviour or store the applied scale on each instance).

## 7.2 Optional GLB optimisation on upload
- A setting (default OFF) to optimise GLBs on upload using @gltf-transform (check current docs/API): Meshopt compression, texture resize to a configurable maximum (e.g. 2048px), and texture conversion to WebP. No Draco.
- Keep the original file; allow reverting a model to its original. Show before/after file size.
- Also an action to optimise already-uploaded models individually or in bulk, with progress.
- Verify optimised models still load in the viewer and render correctly. Include originals in backups.

## 7.3 Camera bookmarks
- Save the current camera as a named bookmark in the scene; list them in a panel; click to jump; rename; delete; update from current view.
- Stored in the scene JSON.

## 7.4 Batch render
- In the render dialog, choose bookmarks to render (or all). Queue them using the current render settings with overall and per-render progress and cancel.
- Each result is saved to the gallery with the camera name in its metadata.

## 7.5 Grouping / parenting
- Ctrl+G groups the selection; Ctrl+Shift+G ungroups. Groups move, rotate and scale as one unit, with correct undo/redo.
- Groups show as expandable nodes in the scene objects list. Select a group or its children individually.
- Saved and restored in scenes (parent ids).

## 7.6 Snap to surface
- A mode (toggle in toolbar) where moving or placing an object raycasts against other objects as well as the floor so it rests on top of them. Ignore the object being moved.
- A button/shortcut "Drop onto surface below" for the selected object(s).
- Works with the arrow-key and drag workflows without surprising jumps.

## 7.7 Ground plane options
- Options: none, shadow catcher (invisible floor that shows only shadows; works with transparent backgrounds), solid colour, image texture. Size and visibility controls.
- Stored in the scene, used in edit mode (simple) and in renders (both the standard and path-traced renderers).
