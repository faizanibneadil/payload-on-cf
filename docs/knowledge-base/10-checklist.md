# 10. Agent checklist (verify before finishing an iteration)

## Always
- [ ] Work only on the iteration branch (from `dev`); never touch `main` or the production D1/R2; never merge
- [ ] Read `AGENTS.md`, `01-architecture-and-decisions.md` and the skills in `.agents/`
- [ ] `pnpm exec tsc --noEmit`, `pnpm lint` (all Biome errors fixed), `pnpm test:int` pass
- [ ] No Radix imports anywhere (`grep -R "radix" src package.json`)
- [ ] Code comments in Roman Urdu; commits and PR text in English
- [ ] No new tests unless the owner asks; remove only tests of deleted behaviour
- [ ] Migrations are new forward migrations, committed, and never edit an applied migration
- [ ] PR description contains "what to test on the dev deployment"

## Auth and permissions
- [ ] Username-only login (`allowEmailLogin: false`); username rules enforced on client and server
- [ ] Sign in / Register modal works; logout works; no `/login` or `/register` pages
- [ ] Only the `admin` role can enter `/admin`
- [ ] `owner` is set server-side; update/delete restricted to owner/admin
- [ ] Private by default; shared playgrounds are readable by anyone with the link; non-owners can never save

## Behaviour
- [ ] No autosave anywhere (no debounced writes, no API calls while typing); one "Save all" saves canvas and code in one row write
- [ ] Unsaved-changes indicator and `beforeunload` warning
- [ ] Rate limits read from the `settings` Global (cached); admin exempt and counters untouched for admin
- [ ] Limits: 10 new playgrounds and 10 saves per playground per 24 h for students (defaults)
- [ ] Content size limit enforced with a clear UI error
- [ ] Theme: light default, toggle at the bottom of the primary bar, no flash on load
- [ ] Heavy modules (Monaco, Lexical canvas, Vivari runtime) are dynamically imported
- [ ] Visitor edits stay in the browser; "Reset to original" works
- [ ] Runtime fallback: unsupported device shows a clear message, editor stays usable, Vanilla always works

## Legacy import
- [ ] Old `?playgroundId=&shortURL=` link opens as an unsaved draft; first Save creates the playground and deletes the old record (owner links only); failures are silent; module isolated in `src/lib/legacy-import.ts`

## Deployment
- [ ] Migrations applied to the remote dev D1 by the workflow; secrets pushed to Cloudflare, not only GitHub
- [ ] Fail-fast env check present; `.env.example` matches the workflow
- [ ] Smoke test passes on the dev deployment
- [ ] Cross-origin isolation headers only on playground pages, not `/admin` or `/api`

## Final summary must include
Implemented items, what was verified (commands run), deviations with reasons, open questions, and the list of things the owner should test on the dev deployment.
