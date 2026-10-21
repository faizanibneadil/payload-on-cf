# 09. Agent checklist (verify before finishing an iteration)

## Always
- [ ] Work only on the agreed branch (from `dev`); never touch `main` or the production D1/R2; never merge
- [ ] Read `AGENTS.md`, `01-architecture-and-decisions.md` and the skills in `.agents/`
- [ ] `pnpm exec tsc --noEmit`, `pnpm lint` (all Biome errors fixed), `pnpm test:int` pass
- [ ] No Radix imports anywhere (`grep -R "radix" src package.json`)
- [ ] No code-editor leftovers come back (`grep -rniE "monaco|vivari|sandpack|nested-docs|cmdk" src package.json` is empty)
- [ ] Code comments in Roman Urdu; commits and PR text in English
- [ ] No new tests unless the owner asks; remove only tests of deleted behaviour
- [ ] Migrations are new forward migrations, committed, and never edit an applied migration
- [ ] PR description (or summary) contains "what to test on the dev deployment"

## Testing and reporting (owner rule, every task)
- [ ] Run the app locally (`pnpm dev`) and test every new or changed feature in a real browser (Playwright with the pre-installed Chromium), as the owner decided it should behave: happy path, wrong input, permissions (signed out, other user, owner, admin), light and dark theme, desktop and mobile width
- [ ] Take screenshots of each tested screen and state and send them to the owner with the final report
- [ ] Check the browser console and server log for errors during the test
- [ ] After the push, check that the GitHub Actions run is green and smoke-test the dev URL
- [ ] Report: what was tested, how, the result of each check (pass/fail), screenshots, and any bug found (fixed, or why not). Nothing untested is reported as done

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
- [ ] Canvas: smooth pan/zoom with many blocks, only visible blocks mounted, one block in edit mode
- [ ] Live markdown: `# `, `- `, `1. ` convert while typing; read-only viewers can only pan and zoom

## Deployment
- [ ] Migrations applied to the remote dev D1 by the workflow; secrets pushed to Cloudflare, not only GitHub
- [ ] Fail-fast env check present; `.env.example` matches the workflow
- [ ] Smoke test passes on the dev deployment

## Final summary must include
Implemented items, what was verified (commands run), deviations with reasons, open questions, and the list of things the owner should test on the dev deployment.
