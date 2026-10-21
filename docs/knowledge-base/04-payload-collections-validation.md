# 04. Collections, Global and validation

Official docs: https://payloadcms.com/docs/fields/overview , https://payloadcms.com/docs/hooks/overview

> Status: the repo still has the OLD `playgrounds` collection (with `theory` and `forkedFrom`). `playground-files` and `nested-docs` are already removed (migration `20261021_193036_drop_playground_files`). Iteration 1 replaces `playgrounds` with `boards` through new forward migrations. Do not build on the old collection.

## Target schema (Iteration 1)
- `users`: auth with `loginWithUsername` (`allowEmailLogin: false`), `role` (`admin` | `instructor`, default `instructor`). Username validation in a field `validate` and in the registration server action.
- `boards`:
  - `title` (max 50, normalized), `slug` (unique, indexed, generated in `beforeValidate`, collision gets a random suffix; reuse `src/lib/title-slug.ts`), `owner` (relationship, indexed, pinned in `beforeChange`), `isShared` (checkbox, default false).
  - `data` (json): `{ canvas: <scene> }` (see `05-board-canvas.md`). One row write per Save. Size is checked in `beforeValidate` against the `settings` Global limit (default 1.8 MB; D1 row limit is 2 MB).
  - `saveCount`, `saveWindowStartedAt` (hook-managed rate limit counters).
  - Indexes: `slug`, and `owner` + `createdAt` (for the "10 boards per 24 h" count query).
- `media`: images for the canvas later (R2), owner only. Not used until the research iteration decides on images.
- Global `settings`: see `03-payload-access-control.md`.

## Rate limit rules (hooks, server side)
- Create: count the user's boards with `createdAt` inside the window (indexed query). If the count is at the limit, reject.
- Update (Save): if `now - saveWindowStartedAt` is past the window, reset `saveCount` to 0 and set a new window start. If `saveCount` is at the limit, reject. Otherwise `saveCount += 1`. The counter change is part of the same row write as the Save.
- Skip all of this for `admin`.

## Validation rules
- Validate the scene shape on the server: known object types only, numeric positions, a cap on object count (about 500) and on markdown length per block.
- Reject `data` larger than the configured max bytes with a clear error message that the UI shows.

## Cost notes (D1 free plan)
- Rows read are counted by rows scanned: every filtered or sorted column needs an index.
- Rows written are counted per affected row, and each indexed column adds one: keep indexes to the ones above.
- No polling and no autosave. One Save writes one `boards` row.
