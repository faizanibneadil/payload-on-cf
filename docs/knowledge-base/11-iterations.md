# 11. Iteration tracker

Status values: `planned` -> `in progress` -> `ready for review` (branch pushed) -> `merged to dev` -> `verified in dev` (owner checked the dev preview).

## Working rules
- Work starts from the latest `dev`. Either one branch per iteration (`feat/iteration-<n>-<name>`) or directly on `dev`, as the owner says for that iteration.
- Commit after every completed step. The agent never merges.
- After the merge the owner previews the dev deployment and reports issues. Fixes go to a new branch from `dev`: `fix/iteration-<n>-issues`.
- The next iteration starts only after the previous one is reviewed.
- `main` and the production D1/R2 are never touched. Only the `dev` environment (its own D1 and R2) is used. The owner merges `dev` into `main` at the end.
- Schema changes use new forward migrations only; never edit an applied migration.

## Iterations

| # | Branch | Scope | Status |
|---|---|---|---|
| 0 | `feat/iteration-0-setup-cleanup` | `dev` branch, CI/CD check, remove old frontend, fork code, unused files; placeholder `/` | merged to dev |
| 0b | `dev` | Boards pivot: remove the code editor and everything around it (playground-files, nested-docs, legacy import, Monaco, resizable, cmdk), comment out the startup email, rewrite the knowledge base | ready for review |
| 1 | `feat/iteration-1-foundation` | shadcn preset `b5rR41Mtnc`, light/dark theme (light default, toggle in the header), users (`admin` / `instructor`, username rules, public Register as instructor), `boards` collection replacing `playgrounds`, `settings` Global, access control, migrations on dev, header, sign-in modal, `/` with My boards | planned |
| 2 | `feat/iteration-2-save-share-limits` | Save (one row write), unsaved indicator + `beforeunload`, rate limits (Global, cached), Share toggle and link, `/b/<slug>` read-only for others | planned |
| 3 | `feat/iteration-3-canvas-core` | infinite canvas: pan/zoom, culling, text blocks with live markdown (`#`, `-`, `1.`), move/resize/delete, undo/redo | planned |
| 4 | research with the owner | Lexical or not, Excalidraw / tldraw vs own engine, drawing tools, images, presenting; decides the next iterations | planned |

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
