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
| 1 | `dev` | shadcn preset `b5rR41Mtnc`, light/dark theme (light default, toggle in the header), users (`admin` / `instructor`, username rules, public Register as instructor), `boards` collection replacing `playgrounds`, `settings` Global, access control, migrations on dev, header, sign-in modal, `/` with My boards | ready for review |
| 2 | `feat/iteration-2-save-share-limits` | Save (one row write), unsaved indicator + `beforeunload`, rate limits (Global, cached), Share toggle and link, `/b/<slug>` read-only for others | planned |
| 3 | `feat/iteration-3-canvas-core` | infinite canvas: pan/zoom, culling, text blocks with live markdown (`#`, `-`, `1.`), move/resize/delete, undo/redo | planned |
| 4 | research with the owner | Lexical or not, Excalidraw / tldraw vs own engine, drawing tools, images, presenting; decides the next iterations | planned |
| 5 | decide with the owner | caching for shared board reads (Next.js vs Cloudflare cache) and its implementation | planned |

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
