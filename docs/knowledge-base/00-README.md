# Knowledge Base: Boards (lecture canvas)

Purpose: reference knowledge for AI coding agents and contributors working on this repo. It adds to the task prompt; it does not replace the official docs.

## Reading order
0. `12-owner-rules-and-learnings.md` (owner rules and every past correction; read first, update after every owner request)
1. `01-architecture-and-decisions.md` (what we are building, fixed decisions)
2. `02-payload-auth-username.md`
3. `03-payload-access-control.md`
4. `04-payload-collections-validation.md`
5. `05-board-canvas.md`
6. `06-cloudflare-d1-deployment.md`
7. `07-github-actions-env-secrets.md`
8. `08-shadcn-base-ui.md`
9. `09-checklist.md`
10. `10-layout-and-header.md` (header, theme, board page)
11. `11-iterations.md` (iteration tracker and working rules; check it first to see what is done)
12. `13-iteration-4-plan.md` (current iteration shape, draft)

When a file disagrees with `01-architecture-and-decisions.md`, `01` wins.

## Rules for agents
- Official docs and installed package type definitions beat this file. If they disagree, follow them and report the difference in your final summary.
- Never invent API names. If unsure, search the docs or read `node_modules/<pkg>/dist/*.d.ts`.
- Preserve existing project config (wrangler, payload config, workflow) and extend it. Do not rewrite working setup.
