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
| 0 | `feat/iteration-0-setup-cleanup` | `dev` branch, CI/CD check, remove old frontend (login/register pages), fork code, unused files, Sandpack/Vivari leftovers and obsolete CI steps; knowledge base update; placeholder `/` so the deploy smoke test passes | in progress |
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
- [ ] CI/CD for `dev` checked end to end
- [ ] Old implementation removed (see 01 for the target architecture)
- [ ] Knowledge base updated
