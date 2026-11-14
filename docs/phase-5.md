# Phase 5: Admin section (backup, restore, reset)

Read SPEC.md first. Implement only this phase. Bugs here can lose data, so be careful, and test with real data. Use the strongest model available for this phase.

## Goals
1. Admin page at /admin (linked from the About popup and toolbar). Group routes under /api/admin/* so authentication can be added later.
2. Overview: storage used (by category), counts of models, scenes, renders, backgrounds, HDRIs, app version.
3. **Backup**
   - A button that downloads ONE .zip containing: the SQLite database, models, thumbnails, backgrounds, HDRIs, renders, scenes, lighting presets, user preferences/settings, and a manifest.json (app version, schema version, timestamp, counts, file list with sizes).
   - The database copy must be consistent: use the SQLite backup API or VACUUM INTO to a temp file, never copy a live DB file directly.
   - Stream the zip so a multi-GB library does not exhaust memory.
   - Filename like `scene-composer-backup-YYYY-MM-DD-HHMM.zip`.
4. **Restore**
   - Upload a backup zip. First validate it (manifest present, expected structure, no path traversal in zip entries, sane sizes) and show a summary of what it contains plus a clear warning that current data will be replaced.
   - On confirm: extract to a temporary directory, validate the DB opens and passes an integrity check, then swap it in. If anything fails, leave current data untouched and show the error.
   - Handle backups from older app/schema versions via a migration step where possible; refuse clearly if the backup is from a newer version.
   - After restore, the app reloads with restored data.
5. **Reset everything**
   - A separate, visually distinct "Danger zone" section.
   - Strong warning dialog explaining exactly what will be deleted, a suggestion (not a requirement) to download a backup first, and a requirement to type RESET to enable the confirm button.
   - Deletes all user data (library, folders, scenes, renders, backgrounds, HDRIs, presets, settings) and returns the app to a fresh-install state, recreating empty directories and a fresh DB.
6. Progress indicators and clear success/error messages for each operation.
7. Add automated tests for backup then restore round-trip (data identical afterwards) and for rejecting a malformed zip.

## Done when
- Backup, wipe via Reset, then Restore returns the app to exactly the previous state (models, folders, scenes, backgrounds, settings).
- A corrupted or wrong zip is rejected without changing existing data.
- Reset leaves the app looking like a new install.
