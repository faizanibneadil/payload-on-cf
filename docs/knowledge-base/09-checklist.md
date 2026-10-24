# 09. Agent checklist (verify before finishing an iteration)

## Always
- [ ] Work on the task branch `task/<id>-<name>` from the latest `dev`; push it and open a PR into `dev`; never push to `dev` or `main` directly, never merge (the owner merges); never touch the production D1/R2
- [ ] Read `AGENTS.md`, `01-architecture-and-decisions.md` and the skills in `.agents/`
- [ ] `pnpm exec tsc --noEmit`, `pnpm lint` (all Biome errors fixed), `pnpm test:int` pass
- [ ] No Radix imports anywhere (`grep -R "radix" src package.json`)
- [ ] No code-editor leftovers come back (`grep -rniE "monaco|vivari|sandpack|nested-docs|cmdk" src package.json` is empty)
- [ ] Code comments in Roman Urdu; commits and PR text in English
- [ ] Every new tool or component has its own tests (owner rule); remove only tests of deleted behaviour
- [ ] Migrations are new forward migrations, committed, and never edit an applied migration
- [ ] PR description (or summary) contains "what to test on the dev deployment"

## Testing and reporting (owner rule, every task)
- [ ] Run the app locally (`pnpm dev`) and test every new or changed feature in a real browser (Playwright with the pre-installed Chromium), as the owner decided it should behave: happy path, wrong input, permissions (signed out, other user, owner, admin), light and dark theme, desktop and mobile width
- [ ] Take screenshots of each tested screen and state and send them to the owner with the final report
- [ ] Check the browser console and server log for errors during the test
- [ ] Before pushing a change that touches server code, also test the production Worker build locally: `opennextjs-cloudflare build`, then `wrangler dev` with a copy of `wrangler.jsonc` whose D1 binding has `"remote": false` (`wrangler.preview.jsonc`, gitignored) and `.dev.vars` with `PAYLOAD_SECRET`. `next dev` hides production-only bugs (minified class names, server action timing)
- [ ] Locally run only the task's spec(s) and the specs of the modules the change touches, e.g. `CHROMIUM_PATH=/opt/pw-browsers/chromium BUILD=1 pnpm exec playwright test tests/e2e/editor/<spec>.spec.mjs` (production Worker build, a fresh local database per spec file; `BUILD=1` forces a new build; `CHROMIUM_PATH` when Playwright's own browser is not installed), plus `pnpm test:int`, `pnpm lint`, `pnpm exec tsc --noEmit`. **Never the whole browser suite locally** (owner): it runs in GitHub Actions after the merge, before the deploy. On a failure open `pnpm test:e2e:report`: each check, screenshots, video and trace
- [ ] Update the task row in `13-task-tracker.md` (status, PR) in the same PR. After the owner merges, follow the Actions run on `dev` (checks, e2e shards, deploy) until it is green; when it is red, report it to the owner after finishing the current work and fix it only with the owner's OK
- [ ] Report: what was tested, how, the result of each check (pass/fail), screenshots, and any bug found (fixed, or why not). Nothing untested is reported as done

## Data safety
- [ ] Anything that saves user work from a long-lived page (the board) uses a plain HTTP endpoint with JSON, never a server action (deploy skew reloads the page). Server actions are fine for short flows (sign in, register, create board)
- [ ] A failed save (network, limit, validation) keeps the unsaved changes on the page and shows a message

## Free plan CPU (10 ms per request)
- [ ] Pages and other read paths do not import or call Payload (`getPayload`, `payload.auth`, `payload.find`); use `getCurrentUser` (`src/lib/session.ts`) and the D1 helpers in `src/lib/board-reads.ts`
- [ ] Any new read query is one indexed D1 query; the same access rule as the Payload collection is applied in code
- [ ] Payload stays for writes (endpoints / actions), because its hooks enforce limits, validation and access

## Auth and permissions
- [ ] Username-only login (`allowEmailLogin: false`); username rules enforced on client and server
- [ ] Sign in / Register modal works; Register always creates an `instructor`; logout works; no `/login` or `/register` pages
- [ ] Only the `admin` role can enter `/admin`
- [ ] `owner` is set server-side; update/delete restricted to owner/admin
- [ ] Private by default; shared boards are readable by anyone with the link; non-owners can never save

## Behaviour
- [ ] No autosave anywhere (no debounced writes, no API calls while typing); one Save writes one row
- [ ] Unsaved-changes indicator and `beforeunload` warning
- [ ] Rate limits read from the `settings` Global (cached); admin exempt and counters untouched for admin
- [ ] Limits: 10 new boards and 10 saves per board per 24 h for instructors (defaults)
- [ ] Content size limit enforced with a clear UI error
- [ ] Theme: light default, toggle in the header, no flash on load; admin panel unchanged
- [ ] Editor: markdown shortcuts convert while typing; inline toolbar only on a selection (no fixed toolbar); long documents stay smooth
- [ ] Read-only viewers cannot change anything; they can click links; the read view needs no Lexical JavaScript

## Deployment
- [ ] Migrations applied to the remote dev D1 by the workflow; secrets pushed to Cloudflare, not only GitHub
- [ ] Fail-fast env check present; `.env.example` matches the workflow
- [ ] Smoke test passes on the dev deployment

## Final summary must include
Implemented items, what was verified (commands run), deviations with reasons, open questions, and the list of things the owner should test on the dev deployment.
