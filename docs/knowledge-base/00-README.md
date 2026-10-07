# Knowledge Base: Playground Project

Purpose: reference knowledge for AI coding agents working on this repo. It supplements the task prompt; it does not replace the official docs.

Last researched: 2026-10-08. Libraries move fast. Each file marks claims as:
- **[Docs]** taken from official documentation at the time of writing
- **[Verify]** believed correct but must be confirmed against the live docs or the installed package types before relying on it

## Reading order
1. `01-architecture-and-decisions.md` (what we are building, fixed decisions)
2. `02-payload-auth-username.md`
3. `03-payload-access-control.md`
4. `04-payload-collections-validation.md`
5. `05-payload-lexical-richtext.md`
6. `06-cloudflare-d1-deployment.md`
7. `07-github-actions-env-secrets.md`
8. `08-vivari-webcontainer.md`
9. `09-shadcn-base-ui.md`
10. `10-checklist.md`

## Rules for agents
- Official docs and installed package type definitions beat this file. If they disagree, follow them and report the difference in your final summary.
- Never invent API names. If unsure, search the docs or read `node_modules/<pkg>/dist/*.d.ts`.
- Preserve existing project config (wrangler, payload config, workflow) and extend it. Do not rewrite working setup.
