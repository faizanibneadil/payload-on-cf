# 14. Session handoff (state as of 23 October 2026)

Read this together with `12-owner-rules-and-learnings.md` (owner rules, every past correction) and `13-task-tracker.md` (what is next) before doing anything.

## Where the project stands
- **Direction changed (owner, October 2026):** the board is no longer an infinite canvas; it is one Lexical document (`05-board-editor.md`). Work is split into small tasks (`13-task-tracker.md`).
- Done and verified: Iterations 0, 0b, 1, 2 (accounts, boards, Save/Share/limits); the Playwright Test setup.
- Current task: see `13-task-tracker.md` (Iteration A, B1-B3 done; B4 unordered list in review; next B5 numbered list).
- Open owner decisions: E (boards per day, now 10), F (`*.devslix.com` wildcard; prod workers.dev URL allowed or not), Code block settings (before F4).

## How to work here
- Flow per task (standing rule 9 in `12`): branch `task/<id>-<name>` from the latest `dev`, push it, open a PR into `dev`; the owner merges; the merge deploys dev (about 3-4 min); the owner checks; mark the task `done`.
- Tests: while working, only the task's spec (`CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test tests/e2e/<spec>`). Before the push, once: `CHROMIUM_PATH=/opt/pw-browsers/chromium BUILD=1 pnpm test:e2e` (builds the production Worker, fresh local DB per spec), `pnpm test:int`, `pnpm lint`, `pnpm exec tsc --noEmit`. Report: `pnpm test:e2e:report`.
- Local server alone: `bash tests/e2e/server.sh start-fresh` (http://127.0.0.1:8787, admin/admin), `bash tests/e2e/server.sh stop`.
- Deploy runs: `curl https://api.github.com/repos/faizanibneadil/payload-on-cf/actions/runs?branch=dev` and the GitHub MCP `get_job_logs`.
- Docs-only commits (`docs/**`, `*.md`) do not deploy.
- Payload's Lexical features (model for every editor task): sparse clone `git clone --depth 1 --filter=blob:none --sparse https://github.com/payloadcms/payload`, then `git sparse-checkout set packages/richtext-lexical/src/features/<feature>` (e.g. `blocks`, `toolbars`, `textState`, `format`, `align`, `indent`, `link`, `experimental_table`). Read it into the scratchpad, never into the repo.

## Environment pitfalls (cloud session)
- Never run `pkill -f` with a pattern that also appears in your own command line: it kills the shell (exit 144). `tests/e2e/server.sh stop` is safe.
- Blocked hosts: `*.workers.dev` (cannot open the dev site directly), `ui.shadcn.com` (read shadcn docs/components from a sparse clone of `https://github.com/shadcn-ui/ui`, e.g. `apps/v4/registry/bases/base/ui/code-block.tsx`).
- Playwright's own browser is not installed: always pass `CHROMIUM_PATH=/opt/pw-browsers/chromium`. Playwright MCP needs `PLAYWRIGHT_MCP_SANDBOX=false` and `PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium` in this container.
- Headless typing is faster than a person: after selection-changing keys and before Enter in a menu, tests wait 50-100 ms.
- `node_modules` may be missing in a fresh container: run `pnpm install` first.
- Running `pnpm payload migrate` a second time on the local DB stops at a "data loss" prompt, because `pnpm seed:admin` adds a dev marker row (`payload_migrations`, batch -1). Delete that row first; CI is not affected (production mode).
- Known flake (24 Oct 2026, task B4): in two of four full runs `auth-boards.spec` (always the first spec) failed once with the local server going away (`ERR_CONNECTION_REFUSED` on `/admin`) and once with the register dialog not opening (page not hydrated within 5 s); alone it passed 3/3 and the next full run passed 7/7. Not related to the editor code (that spec never loads it). Re-run once; if it fails again, investigate the local workerd, not the app.
- Dev D1 id `d7951b74-a34d-4a5f-a544-ef4f2e9a6004`. Production D1/R2 and `main` are never touched.

## Key code map
- Board page: `src/app/(frontend)/b/[slug]/page.tsx`; board state and Save: `src/components/board/board-store.tsx`, `src/collections/board-endpoints.ts`, `src/collections/Boards.ts`.
- Fast read path (free plan CPU): `src/lib/session.ts`, `src/lib/board-reads.ts`.
- Origins per environment: `wrangler.jsonc` `vars` + `src/payload.config.ts`.
- Editor: `src/components/editor/` (`features/` one file per feature: nodes, markdown shortcuts, slash menu items, listed in `features/index.ts`; `board-editor.tsx` Lexical + plugins, `editor-loader.tsx` lazy chunk, `theme.ts` classes shared with the read view). Read view: `src/components/read-view/document-view.tsx` (server). Document model and validation: `src/lib/document.ts` (each new node type adds a rule there and a renderer in the read view).
