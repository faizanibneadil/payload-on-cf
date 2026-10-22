# 04. Collections, Global and validation

Official docs: https://payloadcms.com/docs/fields/overview , https://payloadcms.com/docs/hooks/overview

> Status: built in Iteration 1 (schema, migration `20261021_201333_boards_and_instructor_role`) and Iteration 2 (limits). The old `playgrounds` and `playground-files` collections are gone.

## Schema
- `users`: auth with `loginWithUsername` (`allowEmailLogin: false`), `role` (`admin` | `instructor`, default `instructor`). Username validation in a field `validate` and in the registration server action.
- `boards`:
  - `title` (max 50, normalized), `slug` (unique, indexed, generated once on create in `beforeValidate`, collision gets a random suffix; never changes afterwards, so a shared link keeps working after a rename; reuse `src/lib/title-slug.ts`), `owner` (relationship, indexed, pinned in `beforeChange`), `isShared` (checkbox, default false).
  - `data` (json): `{ canvas: <scene> }` (see `05-board-canvas.md`). One row write per Save. Size is checked in `beforeValidate` against the `settings` Global limit (default 1.8 MB; D1 row limit is 2 MB).
  - `saveCount`, `saveWindowStartedAt` (hook-managed rate limit counters).
  - Indexes: `slug`, and `owner` + `createdAt` (for the "10 boards per 24 h" count query).
- `media`: images for the canvas later (R2), owner only. Not used until the research iteration decides on images.
- Global `settings`: see `03-payload-access-control.md`.

## Rate limit rules (hooks, server side)
- Create: count the user's boards with `createdAt` inside the window (indexed query). If the count is at the limit, reject.
- Update (Save): only when the content changes (title or `data`); turning Share on/off is not a save. If `now - saveWindowStartedAt` is past the window, reset `saveCount` to 0 and set a new window start. If `saveCount` is at the limit, reject. Otherwise `saveCount += 1`. The counter change is part of the same row write as the Save.
- Limit errors are `APIError` with status 429 and a message that says when to try again; server actions read `status` / `message` (never `instanceof`, see `09`).
- The `settings` Global is cached for 10 s per Worker isolate, so a changed limit can take up to 10 s to apply everywhere.
- Skip all of this for `admin`.

## Validation rules
- Validate the scene shape on the server: known object types only, numeric positions, a cap on object count (about 500) and on markdown length per block.
- Reject `data` larger than the configured max bytes with a clear error message that the UI shows.

## Cost notes (D1 free plan)
- Rows read are counted by rows scanned: every filtered or sorted column needs an index.
- Rows written are counted per affected row, and each indexed column adds one: keep indexes to the ones above.
- No polling and no autosave. One Save writes one `boards` row.
