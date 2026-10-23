# 14. Session handoff (state at the end of the session of 22-23 October 2026)

Read this together with `12-owner-rules-and-learnings.md` (owner rules, every past correction) before doing anything.

## Where the project stands
- Branch `dev`, last commit `ce00bb8` "Rebuild text blocks on Lexical", deployed to https://payload-on-cf-dev.faizanibneadil1.workers.dev, CI green, live-check 17/17. Working tree clean.
- Done and verified by the owner: Iterations 0, 0b, 1, 2, 3; Iteration 4 step 1 (Playwright Test + MCP).
- Done, **waiting for the owner's check**: Iteration 4 step 2 (text blocks on Lexical: click-anywhere-and-type, auto width, inline toolbar, slash menu, to-do lists, save while editing). Agent choices G-K in `12` need the owner's confirmation.
- Next planned (before the owner's new architectural change): step 3 code block (shadcn `code-block`, Base UI version, line numbers + copy) and tables; then engine upgrade, shapes, pen/eraser, links, UI component mechanism (`13-iteration-4-plan.md`).
- Open owner decisions: C (live-check trigger), E (boards per day, now 10), F (`*.devslix.com` wildcard; prod workers.dev URL allowed or not).

## How to work here
- Tests: `CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm test:e2e` (add `BUILD=1` after code changes; builds the production Worker, fresh local DB per spec, 5 specs, about 5 minutes). Report: `pnpm test:e2e:report`. Unit: `pnpm test:int`. Also `pnpm lint`, `pnpm exec tsc --noEmit`.
- Local server alone: `bash tests/e2e/server.sh start-fresh` (http://127.0.0.1:8787, admin/admin), `bash tests/e2e/server.sh stop`.
- Push to `dev` deploys (about 3 min). Put `[live-check]` in the commit message for server/auth/deploy changes; then check the run with `curl https://api.github.com/repos/faizanibneadil/payload-on-cf/actions/runs?branch=dev` and the GitHub MCP `get_job_logs`.
- Docs-only commits (`docs/**`, `*.md`) do not deploy.

## Environment pitfalls (cloud session)
- Never run `pkill -f` with a pattern that also appears in your own command line: it kills the shell (exit 144). `tests/e2e/server.sh stop` is safe.
- Blocked hosts: `*.workers.dev` (cannot open the dev site directly; use CI live-check), `ui.shadcn.com` (read shadcn docs/components from a sparse clone: `git clone --depth 1 --filter=blob:none --sparse https://github.com/shadcn-ui/ui`, e.g. `apps/v4/registry/bases/base/ui/code-block.tsx`, `apps/v4/content/docs/components/base/code-block.mdx`).
- Playwright's own browser is not installed: always pass `CHROMIUM_PATH=/opt/pw-browsers/chromium`. Playwright MCP needs `PLAYWRIGHT_MCP_SANDBOX=false` and `PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium` in this container (it timed out at the start of this session).
- Headless typing is faster than a person: after selection-changing keys (Home, Shift+Arrow, toolbar clicks) and before Enter in the slash menu, tests wait 50-100 ms (`settle()` in `text-blocks.spec.mjs`).
- Dev D1 id `d7951b74-a34d-4a5f-a544-ef4f2e9a6004` (Cloudflare MCP `d1_database_query` worked earlier). Production D1/R2 and `main` are never touched.

## Key code map
- Canvas: `src/components/canvas/board-canvas.tsx` (viewport, culling, tools, history, click-to-type, draft/flush), `text-block.tsx` (block, border resize, corner scale, auto width), `lexical/*` (editor, read view, toolbar, slash menu, list shortcuts, config).
- Board state and Save: `src/components/board/board-store.tsx` (Save/Share via endpoints, `setFlushSource`), `src/collections/board-endpoints.ts`.
- Scene model and server validation: `src/lib/scene.ts`.
- Fast read path (free plan CPU): `src/lib/session.ts`, `src/lib/board-reads.ts`.
- Origins per environment: `wrangler.jsonc` `vars` + `src/payload.config.ts`.
