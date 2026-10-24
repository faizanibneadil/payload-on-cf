# 11. Iteration tracker

Iterations are small; every feature inside one is its own task. Tasks and their status live in `13-task-tracker.md`.

## Working rules (owner, October 2026)
- One feature = one task. Per task: branch `task/<id>-<name>` from the latest `dev`, build + tests, push the branch, open a PR into `dev`. The **owner merges** (the agent never merges and never pushes to `dev` directly). The merge deploys dev; the owner checks it there; then the task is marked `done` in `13`.
- The next iteration starts only after the owner verified the previous one.
- `main` and the production D1/R2 are never touched. The owner merges `dev` into `main` at the end.
- Schema changes use new forward migrations only; never edit an applied migration.
- Every task has its own tests and ends with browser testing and screenshots (`09-checklist.md`). Locally only the tests of the changed modules run; the whole suite runs in GitHub Actions before every deploy (task CI1).
- Before the final merge to `main`: decide caching for board reads with the owner (open decision in `01`).

## Iterations
| # | Scope | Status |
|---|---|---|
| 0 | `dev` branch, CI/CD check, remove old frontend | done |
| 0b | Boards pivot: remove the code editor and everything around it | done |
| 1 | shadcn theme, light/dark, users and roles, `boards` collection, `settings` Global, access control, header, sign-in modal, My boards | done |
| 2 | Save, unsaved indicator, rate limits, Share, read-only view | done |
| 3, 4 | Infinite canvas with text blocks (Lexical in step 4.2) | **replaced** by the board editor (owner, October 2026); code removed in task A3, kept in git history |
| A | Clean-up and foundation: knowledge base, remove live-check, remove canvas, Lexical document | in progress (`13`) |
| B | Text types: slash menu, headings, quote, lists, check list, horizontal rule, indent, alignment | planned |
| C | Inline toolbar: formats, text type dropdown, alignment/indent, colours | planned |
| D | Links | planned |
| E | Tables | planned |
| F | Blocks and inline blocks, Code block | planned |
| G | Canvas block and inline block (from scratch) | planned |
| later | Caching for shared board reads; emoji library; typography | decide with the owner |

## Backlog (later, decide with the owner first)
- AI lecture design: only after the product is ready and has user feedback

## Per-iteration log
(Filled in as work completes: steps done, what to test on dev, issues found.)

### Iteration 0
- [x] `dev` created from `main` and pushed
- [x] CI/CD for `dev` reviewed and fixed (real deployed URL in the smoke test, unused build env removed, `contents: read` permissions)
- [x] Old implementation removed: `/login`, `/register`, `/p/[slug]`, server actions (fork included), `components/playground`, Tiptap, Monaco helpers, preview builder, `vv-*` CSS
- [x] `/` is a placeholder so the smoke test passes
- Merged to `dev` (PR #21).

### Iteration 0b (Boards pivot)
- [x] Removed `playground-files` collection and `nested-docs` plugin; forward migration `20261021_193036_drop_playground_files` drops their tables
- [x] Removed `lib/legacy-import.ts`, `lib/default-files.ts`, `lib/playground-tree.ts`, `lib/file-rules.ts`
- [x] Removed `monaco-editor`, `@monaco-editor/react`, `react-resizable-panels`, `cmdk`, `components/ui/command.tsx`, `components/ui/resizable.tsx` and their CSS; removed the outdated frontend e2e spec
- [x] `onInit` startup email commented out
- [x] Knowledge base rewritten for Boards (files renumbered 00-11, contradictions on COOP/COEP, registration and shadcn preset settled)
- Kept until Iteration 1: `collections/Playgrounds.ts` (old schema, replaced by `boards`), `lib/title-slug.ts` (reused for board slugs)
- Test on the dev deployment: the workflow is green (migration applies to the dev D1), `/` shows the placeholder, `/admin` loads, the admin can sign in, Playground Files no longer appears in the admin sidebar.

### Iteration 1 (Foundation)
- [x] Users: roles `admin` / `instructor` (default `instructor`), username lowercased and validated on the server (`beforeValidate`) and in the client form (`src/lib/username.ts`), `admin` reserved at registration, user delete also deletes their boards
- [x] Public registration in a server action (`registerAction`): role always `instructor`, honeypot, clear "already taken" message, signs in after register. Sign in / sign out use `login` / `logout` from `@payloadcms/next/auth`
- [x] `boards` collection replaces `playgrounds` (title, slug, owner, isShared, data, saveCount, saveWindowStartedAt; indexes slug and owner + createdAt), access control as in `03`, size check against the `settings` Global
- [x] `settings` Global (window hours, boards per window, saves per board per window, max content bytes) with a 10 s Worker-memory cache cleared on update
- [x] Migration `20261021_201333_boards_and_instructor_role`: creates `boards` and `settings`, drops `playgrounds`, rebuilds `users` with the new default and sets old `user` roles to `instructor`. Generated SQL fixed by hand: the locked-documents copy selected a column that did not exist yet. Side effect: the `users` rebuild cascades `users_sessions`, so everyone signs in again once after the deploy
- [x] Header (product name, board title, theme toggle, user menu or Sign in), one Sign in / Register modal, New board dialog, `/` (intro or My boards), `/b/<slug>` (title, "View only" for non-owners, canvas placeholder), not-found page with header, favicon
- [x] Light/dark theme: light default, stored in a cookie and applied by the server layout (no script, no flash). Payload admin unchanged
- [x] Removed the admin login extras that linked to the removed `/register` page
- Not done: shadcn preset `b5rR41Mtnc` — `ui.shadcn.com` is blocked by the agent's network. The existing base-nova neutral theme is used for light and dark; apply the preset with `pnpm dlx shadcn@latest init --preset b5rR41Mtnc` from a machine with access (or allow the host) and re-check the Base UI variant
- Verified: tsc, Biome, `pnpm test:int` (9/9), migrations on a fresh DB and over old-shape data (roles converted, old tables dropped), schema drift check clean, browser test 48/48 checks (Playwright + Chromium, desktop and mobile, light and dark), screenshots sent to the owner
- Test on the dev deployment: register a new account (gets "Instructor"), sign out / sign in, create two boards with the same title (second slug gets a suffix), open a board as another user or signed out (private = 404), toggle dark theme and reload, `/admin` with the admin account (Boards, Settings, Users with roles), `/admin` with an instructor (unauthorized)

### Fix: sign out and production-only bugs (after the owner's dev test)
- Owner report: on dev, sign out did not finish, a hard refresh showed 404, a later refresh kept loading for minutes
- Cause found: the sign-out server action deletes the cookie, so Next re-rendered the current page (a private board) without a user inside the action response; that render is a 404 and the action response broke, so the client never navigated. Fix: `logoutAction` now redirects to `/` on the server
- Also found only in the production build: auth errors were matched by class name (`err.name`), which is minified in the Worker bundle, so a wrong password showed "Something went wrong". Fix: match by HTTP status and message (also for board validation errors)
- The minutes-long loading could not be reproduced locally (local workerd, cancelled and repeated requests all answer in < 1 s). The new `live-check` job tests the real dev URL after every deploy to catch it if it happens again
- Verified on the production Worker build (local workerd): iteration 1 suite 49/49, live check 13/13

### Iteration 2 (Save / Share / Limits)
- [x] Board editor state (`components/board/board-store.tsx`): title + canvas data and the saved snapshot; Save writes both in one row (`saveBoardAction`), no autosave; Ctrl/Cmd+S
- [x] Unsaved indicator, Save disabled when clean or the title is invalid, `beforeunload` warning, confirm before leaving through the logo or the user menu
- [x] Share popover: switch (saved at once, not counted as a save), full link, Copy (only while shared); others see the board read-only with "View only"; turning Share off makes the link 404 again
- [x] Limits in the Boards hooks, read from the cached `settings` Global: boards per window on create, saves per board per window on content change, 429 with "try again in ..." message; admin exempt and counters untouched; size limit message
- [x] Slug no longer changes on rename (shared links stay valid)
- [x] New shadcn-style `switch` and `popover` components (Base UI); username hidden in the mobile header
- [x] `live-check` now also renames + saves and turns Share on/off (visitor 200, then 404)
- Bugs found by the tests and fixed before push: Save failed with "This field is required" (slug removed on update)
- Verified: tsc, Biome, `pnpm test:int`; browser suites on `next dev` and on the production Worker build (local workerd): iteration 2 44/44, iteration 1 49/49, live check 16/16
- Test on the dev deployment: rename a board (unsaved dot appears), reload (browser warns), Save (toast with saves left), reload (title kept, same link), Share on + Copy link, open the link in a private window (view only), Share off (404), in `/admin` > Settings lower "saves per board" to test the limit message, then set it back

### Fix: saves lost during a deploy (found by live-check)
- The live-check failed twice right after a deploy: the canvas Save request was aborted and the page reloaded itself, so the new block was lost. Locally (also with 400 ms latency) it never happened. Most likely cause: deploy skew (an old page calling a new Worker version through a server action makes Next reload the page)
- Fix: Save and Share moved from server actions to Payload endpoints `POST /api/boards/:id/save` and `/share` (same access control and limits through the collection); the page calls them with `fetch`, and any failure only shows a message and keeps the unsaved changes
- live-check: waits 30 s after deploy before testing, and logs server action status, navigations and the page state on any failed step
- Verified on the production Worker build: iteration 2 51/51 (new: failed save keeps changes and does not reload, endpoint 401/403), canvas 60/60, iteration 1 49/49, live check 17/17

### Fix: "Error 1102 Worker exceeded resource limits" on the free plan
- Live check after the endpoint fix: after the private-board 404, every request returned Cloudflare error 1102 for about 30 s. The owner decided to stay on the Workers free plan (10 ms CPU per request)
- Measured: Payload cold start ~55 ms CPU, `payload.auth` ~12-26 ms (called twice per page), `payload.find` ~20-35 ms
- Fix: page reads no longer load Payload. `getCurrentUser` verifies Payload's JWT with `jose` (same secret derivation and auth version) and checks the session in `users_sessions` with one D1 query (request-cached); board page and My boards read D1 directly with the collection's access rule
- Verified: old token after sign out is rejected, tampered token rejected; production build suites: iteration 1 49/49, iteration 2 51/51 (size limit now checked through the save endpoint the UI uses), canvas 60/60, live check 17/17
- Still heavy on the free plan: register (~400 ms CPU for password hashing) and sign in (~100 ms); these are rare, but can occasionally return 1102

### Iterations 3 and 4 (infinite canvas) — replaced
The infinite canvas (pan/zoom, culling, text blocks, border resize, Lexical text blocks) was built and verified, then replaced by the board editor (owner, October 2026). Its details are in git history (`docs/knowledge-base/05-board-canvas.md` before task A1). Iteration 4 step 1 stays: browser tests run on the Playwright Test runner with an HTML report, and `.mcp.json` configures Playwright MCP.
