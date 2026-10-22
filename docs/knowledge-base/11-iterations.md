# 11. Iteration tracker

Status values: `planned` -> `in progress` -> `ready for review` (branch pushed) -> `merged to dev` -> `verified in dev` (owner checked the dev preview).

## Working rules
- Work starts from the latest `dev`. Either one branch per iteration (`feat/iteration-<n>-<name>`) or directly on `dev`, as the owner says for that iteration.
- Commit after every completed step. The agent never merges.
- After the merge the owner previews the dev deployment and reports issues. Fixes go to a new branch from `dev`: `fix/iteration-<n>-issues`.
- The next iteration starts only after the previous one is reviewed.
- `main` and the production D1/R2 are never touched. Only the `dev` environment (its own D1 and R2) is used. The owner merges `dev` into `main` at the end.
- Schema changes use new forward migrations only; never edit an applied migration.
- Every task ends with browser testing and screenshots (see `09-checklist.md`, section "Testing and reporting"). No feature or bug may reach production untested.
- Before the final merge to `main`: decide caching for board reads with the owner (open decision in `01`).

## Iterations

| # | Branch | Scope | Status |
|---|---|---|---|
| 0 | `feat/iteration-0-setup-cleanup` | `dev` branch, CI/CD check, remove old frontend, fork code, unused files; placeholder `/` | merged to dev |
| 0b | `dev` | Boards pivot: remove the code editor and everything around it (playground-files, nested-docs, legacy import, Monaco, resizable, cmdk), comment out the startup email, rewrite the knowledge base | verified in dev |
| 1 | `dev` | shadcn preset `b5rR41Mtnc`, light/dark theme (light default, toggle in the header), users (`admin` / `instructor`, username rules, public Register as instructor), `boards` collection replacing `playgrounds`, `settings` Global, access control, migrations on dev, header, sign-in modal, `/` with My boards | verified in dev |
| 2 | `dev` | Save (one row write), unsaved indicator + `beforeunload`, rate limits (Global, cached), Share toggle and link, `/b/<slug>` read-only for others | verified in dev |
| 3 | `dev` | infinite canvas: pan/zoom, culling, text blocks with live markdown (`#`, `-`, `1.`), move/resize/delete, undo/redo | verified in dev |
| 4 | shape under discussion (`13-iteration-4-plan.md`) | whiteboard tools on our own engine: shapes, images (R2), rich text blocks (Lexical), engine upgrades | planned |
| 5 | decide with the owner | caching for shared board reads (Next.js vs Cloudflare cache) and its implementation | planned |
| 6 | decide with the owner | emoji library on the board (options compared together first) | planned |
| 7 | last, with the owner | typography: font family, font size (shadcn typeset style) for lecture text | planned |

## Backlog (later, decide with the owner first)
- Presentation mode: first decide how the instructor picks which blocks belong to a slide and how they arrange slides
- AI lecture design: only after the product is ready and has user feedback

## Per-iteration log
(Filled in as work completes: steps done, what to test in the dev preview, issues found.)

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

### Iteration 3 (Canvas core)
- [x] Scene model, server validation and markdown parse/serialize in `src/lib/scene.ts` (unit tests in `tests/int/scene.int.spec.ts`)
- [x] Infinite canvas (`board-canvas.tsx`, lazy-loaded): pan, zoom at cursor / pinch, Fit, 100 %, adaptive dot grid, culling, tools Select / Hand / Text, undo/redo, keyboard shortcuts (V, H, T, Space, Enter, Delete, Esc, Ctrl/Cmd+Z/Y)
- [x] Text blocks (`text-block.tsx`, `text-editor.tsx`): live markdown (`#`, `##`, `###`, `-`, `1.`), move, width resize, z-order, delete, empty block removed on exit
- [x] Board store now holds scene objects; viewport saved with each Save but not counted as a change; visitors open fitted to the content
- Bugs found by the tests and fixed before push: Text tool block lost focus (browser mousedown), list line could not become a heading, pasted first line lost its heading, one Ctrl+wheel notch zoomed to 400 %, dense grid at 10 %, mobile visitor saw the board off screen
- Verified on the production Worker build (local workerd): canvas suite 50/50, iteration 2 44/44, iteration 1 49/49, live check 17/17 (now also adds a markdown block, saves and reloads); `next dev` canvas suite too
- Test on the dev deployment: double-click the canvas, type `# Title`, Enter, text, `- item`, Enter, Enter, `1. step`; Esc; drag the block; resize with the right handle; Ctrl+Z / Ctrl+Shift+Z; Ctrl + wheel zoom; Fit; Save and reload; share and open the link on a phone (whole board visible, pinch zoom, one-finger pan)

### Fix: resize in both directions (owner request after Iteration 3)
- [x] 8 resize handles (corners + edges) instead of the right-edge width handle; top/left handles move x/y; height is a minimum height that can never go below the text; the block still grows while typing
- [x] Real rendered heights are tracked (ResizeObserver) for culling and Fit; `validateScene` checks height (1-10,000)
- Verified on the production Worker build: canvas suite 60/60 (new: 8 handles, corner, bottom, top, left, top-left, clamp at text height, undo, Save + reload, auto-grow), iteration 2 44/44, iteration 1 49/49, live check 17/17, unit tests 15/15
- Test on the dev deployment: select a block, drag each corner and edge, try to make it shorter than its text (it stops), make it taller (space below), Ctrl+Z, Save and reload

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

### Fix: resize by the border lines (owner request)
- [x] The 8 visible handle squares are gone. Resizing works by dragging the block's border lines (top, bottom, left, right) and corners: invisible grab areas centred on the border (8 screen px on edges, 14 px on corners, same size at any zoom) with `ns`/`ew`/`nwse`/`nesw` resize cursors. They are active on every editable block (no need to select first), never while editing and never for visitors
- [x] Selected and editing blocks use the same thin border as hover (`ring-1 ring-primary/30`) instead of the thick ring
- Verified on the production Worker build: canvas suite 64/64 (new: selected border equals hover border, no visible handles, cursors on every edge/corner and move cursor inside, unselected block resizes straight from its right border, visitor has no grab areas; all resize checks now drag the real border lines), iteration 2 51/51, iteration 1 49/49
- live-check on the dev deployment: first run 11/17 (Error 1102 on every request on one connection for about 60 s, right after sign out; ray IDs e.g. `a4e825c5fce4942c`, `a4e82683bbaa942c`, 22 Oct 2026 11:26-11:27 UTC). The change was client-only and the next runs had no 1102, so this is the known free-plan risk, not this change; still open (needs Workers Logs to find which request goes over). Second run found a race in the live-check itself (canvas step waited for the previous step's "Saved" toast and reloaded during the save); fixed by waiting for the unsaved indicator to go away. Third run 17/17

### Text scales on corner resize + faster CI (owner request)
- [x] Corner drag scales the whole block in proportion, text included (new optional `scale` on text objects, 0.25-8, validated on the server; old boards without it stay at 1). Edge drag still changes only width/height and the text wraps again (same split as tldraw)
- [x] CI: the browser live-check is no longer a job in `deploy.yml`. It is its own reusable workflow (`live-check.yml`), run by hand (button available once the file is on `main`) or called from `deploy.yml` when a dev commit message contains `[live-check]`, using the runner's preinstalled Google Chrome. A normal push now runs only the deploy (about 4 min) and the deploy queue never waits for the live-check. `.next/cache` is cached between builds
- Verified on the production Worker build: canvas suite 67/67 (new: corner scales block and text in proportion, edge keeps text size, top-left corner keeps the bottom-right fixed, text size survives Save + reload), iteration 2 51/51, live check 17/17 (local), validation of `scale` (0.1, 9, "2", NaN rejected)

### Browser suites in the repo + origins per environment (owner request)
- [x] `tests/browser/` holds the three suites; `pnpm test:browser [--build]` runs them and the live-check on the production Worker build, each on a fresh local database
- [x] `serverURL`, `cors`, `csrf` from `wrangler.jsonc` `vars`: production `https://lecture.devslix.com` (same as `main` had), dev `https://payload-on-cf-dev.faizanibneadil1.workers.dev`. Off in `next dev`. Test API calls now send `Origin` like a browser does
- Verified locally with csrf on (`.dev.vars` origins = local URL): auth-boards 49/49, save-share 52/52 (new: save from another site refused even with the owner cookie), canvas 67/67, live check 17/17
- Open: `*.devslix.com` wildcard (choice F in `12-owner-rules-and-learnings.md`)
