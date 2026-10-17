# Knowledge Base: Playground Project

Purpose: reference knowledge for AI coding agents and contributors working on this repo. It supplements the task prompt; it does not replace the official docs.

## Reading order
1. `01-architecture-and-decisions.md` (what we are building, fixed decisions)
2. `02-payload-auth-username.md`
3. `03-payload-access-control.md`
4. `04-payload-collections-validation.md`
5. `05-theory-tiptap.md`
6. `06-cloudflare-d1-deployment.md`
7. `07-github-actions-env-secrets.md`
8. `09-shadcn-base-ui.md`
9. `10-checklist.md`
10. `11-panel-layout.mdx` (panel layout, preview tabs, theory toolbar)
11. `12-iterations.md` (iteration tracker and working rules; check it first to see what is done)

Files 02-11 are being updated iteration by iteration. When one of them disagrees with `01-architecture-and-decisions.md`, `01` wins.

## Rules for agents
- Official docs and installed package type definitions beat this file. If they disagree, follow them and report the difference in your final summary.
- Never invent API names. If unsure, search the docs or read `node_modules/<pkg>/dist/*.d.ts`.
- Preserve existing project config (wrangler, payload config, workflow) and extend it. Do not rewrite working setup.
