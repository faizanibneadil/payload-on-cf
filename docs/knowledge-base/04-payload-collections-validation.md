# 04. Collections, Global and validation

Official docs: https://payloadcms.com/docs/fields/overview , https://payloadcms.com/docs/hooks/overview

> Status: the collections currently in the repo (`playgrounds` + `playground-files` with `nested-docs`) are the OLD design. Iteration 1 replaces them with the schema below through new forward migrations. Do not build on the old files.

## Target schema (Iteration 1)
- `users`: auth with `loginWithUsername` (`allowEmailLogin: false`), `role` (`admin` | `user`). Username validation in a field `validate` and in the registration server action.
- `playgrounds`:
  - `title` (max 50, normalized), `slug` (unique, indexed, generated in `beforeValidate`, collision gets a random suffix), `owner` (relationship, indexed, pinned in `beforeChange`), `isShared` (checkbox, default false).
  - `template` (`vanilla` | `react` | `nextjs`, set at creation, never changed).
  - `data` (json): `{ files: <tree of source files>, canvas: <scene> }`. One row write per Save. Size is checked in `beforeValidate` against the `settings` Global limit (default 1.8 MB; D1 row limit is 2 MB).
  - `saveCount`, `saveWindowStartedAt` (hook-managed rate limit counters).
  - Indexes: `slug`, and `owner` + `createdAt` (for the "10 playgrounds per 24 h" count query).
- `media`: images pasted on the canvas (R2), owner only.
- Global `settings`: see `03-payload-access-control.md`.

## Rate limit rules (hooks, server side)
- Create: count the user's playgrounds with `createdAt` inside the window (indexed query). If the count is at the limit, reject.
- Update (Save): if `now - saveWindowStartedAt` is past the window, reset `saveCount` to 0 and set a new window start. If `saveCount` is at the limit, reject. Otherwise `saveCount += 1`. The counter change is part of the same row write as the Save.
- Skip all of this for `admin`.

## Validation rules
- Only source files are stored: reject paths under `node_modules`, `.next`, `dist`, `build`, and the lockfiles. Limit file count (about 100) and depth, and reject unsafe names (`..`, absolute paths).
- Reject `data` larger than the configured max bytes with a clear error message that the UI shows.

## Cost notes (D1 free plan)
- Rows read are counted by rows scanned: every filtered or sorted column needs an index.
- Rows written are counted per affected row, and each indexed column adds one: keep indexes to the ones above.
- No polling and no autosave. One Save writes one `playgrounds` row.
