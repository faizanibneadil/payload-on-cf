# 12. Iteration tracker

Status values: `planned` -> `in progress` -> `ready for review` (branch pushed) -> `merged to dev` -> `verified in dev` (owner checked the dev preview).

## Working rules
- One branch per iteration, created from the latest `dev`: `feat/iteration-<n>-<name>`.
- Commit after every completed step. The agent never merges. The owner merges the iteration branch into `dev` and tells the agent.
- After the merge the owner previews the dev deployment and reports issues. Fixes go to a new branch from `dev`: `fix/iteration-<n>-issues` (one branch per iteration; a separate branch only for a blocker).
- The next iteration starts only after the previous one is merged.
- `main` and the production D1/R2 are never touched. Only the `dev` environment (its own D1 and R2) is used. The owner merges `dev` into `main` at the end.
- Schema changes use new forward migrations only; never edit an applied migration.

## Iterations

| # | Branch | Scope | Status |
|---|---|---|---|
| 0 | `feat/iteration-0-setup-cleanup` | `dev` branch, CI/CD check, remove old frontend (login/register pages), fork code, unused files, Sandpack/Vivari leftovers and obsolete CI steps; knowledge base update; placeholder `/` so the deploy smoke test passes | ready for review |
| 1 | `feat/iteration-1-foundation` | shadcn preset `b5rR41Mtnc`, light/dark theme (light default, toggle at the bottom of the primary bar), users (username rules), new `playgrounds` schema (single JSON field, `isShared`, counters), `settings` Global, access control, migrations on dev, header with Theory / Editor / Both tabs, sign-in modal | planned |
| 2 | `feat/iteration-2-save-share-limits` | "Save all", rate limits (read from the Global, cached), Share toggle and link, visitor changes stored in the visitor's browser, legacy URL-state import module | planned |
| 3 | `feat/iteration-3-canvas-core` | infinite canvas: pan/zoom, Lexical text blocks (markdown shortcuts, "/" menu, code blocks), shapes and pen | planned |
| 4 | `feat/iteration-4-canvas-advanced` | Moveable/Selecto spike first (React 19), multi-select, groups, alignment, snapping, drag-and-drop, undo/redo, image paste | planned |
| 5 | `feat/iteration-5-editor-tab` | VS Code-style UI, Monaco, file explorer, preview tabs, Vivari runtime and terminal (cross-origin isolation headers, fallback), templates | planned |
| 6 | `feat/iteration-6-polish` | cache components spike (only if it runs on the Worker), Biome, type check, final cleanup | planned |

## Per-iteration log
(Filled in as work completes: steps done, what to test in the dev preview, issues found.)

### Iteration 0
- [x] `dev` created from `main` and pushed (same commit as `main`)
- [x] CI/CD for `dev` reviewed: it already deploys the `dev` environment (own D1/R2). Fixed: the smoke test now uses the real deployed URL taken from the deploy log (the old hardcoded `*.workers.dev` URLs had no account subdomain), the unused build-time `NEXT_PUBLIC_SERVER_URL` was removed (nothing reads it), and workflow permissions were reduced to `contents: read`. The workflow still has to run once on `dev` to prove the smoke test (see below).
- [x] Old implementation removed: `/login` and `/register` pages and actions, `/p/[slug]` and all server actions (fork included), the whole `components/playground` tree, Tiptap (code and dependencies, `lowlight`, `prettier`), Monaco helpers, preview document builder, Vivari-style `vv-*` CSS (terminal, breakpoint and debugger styles), highlight.js CSS, `typeset.css`, `session.ts`, `use-media-query.ts`, fork title helper and its test
- [x] Knowledge base updated (01, 02, 03, 04, 05, 09, 10, 11 rewritten or edited; 05 and 11 replaced)
- [x] `/` is now a placeholder so the smoke test passes
- Kept on purpose until their iteration: `collections/*` (old schema, replaced in Iteration 1 with forward migrations, including dropping `forkedFrom`), `lib/file-rules.ts`, `lib/playground-tree.ts`, `lib/title-slug.ts` (used by the old collections), `lib/legacy-import.ts` and `lib/default-files.ts` (legacy import, wired again in Iteration 2), `components/ui/*` (shadcn), `monaco-editor`, `@monaco-editor/react`, `react-resizable-panels`, `cmdk`, `sonner` (target-stack libraries used by later iterations)
- Verified: `tsc --noEmit` clean, Biome clean, `pnpm test:int` 4 files / 9 tests pass.
- Test on the dev deployment after merge: `/` shows the placeholder (HTTP 200), `/admin` loads and the admin can sign in, `/login`, `/register` and `/p/anything` return 404, the GitHub Actions run is green (including the smoke test step).
