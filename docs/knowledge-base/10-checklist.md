# 10. Agent checklist (verify before finishing)

## Setup
- [ ] Read AGENTS.md and every skill in `.agents/`
- [ ] Neon/Postgres removed; D1 adapter in use; existing wrangler/payload config preserved
- [ ] `cn` npm package NOT installed; `lib/utils.ts` has shadcn `cn()`
- [ ] No Radix imports anywhere (`grep -R "radix" src package.json`)

## Auth and permissions
- [ ] `auth.loginWithUsername` configured; email not required; no registration UI
- [ ] Regular users pass `access.admin` but cannot see/edit other users or foreign playgrounds
- [ ] `owner` set server-side; update/delete restricted to owner/admin
- [ ] Non-owner Save triggers fork; anonymous Save/Fork goes to login

## Behavior
- [ ] Default tab = Practical
- [ ] **No autosave** (no debounced writes, no API calls while typing). Save is one request
- [ ] Unsaved-changes indicator/warning present
- [ ] Title: live normalization, max 50, unique (DB unique index + validate + Save-time availability check), fallback `untitled-<id>`
- [ ] Route is `/p/[slug]`; unknown slug returns 404
- [ ] Share uses `navigator.share` with clipboard fallback
- [ ] Theme toggle persists; no flash
- [ ] Theory: inline toolbar only, no fixed toolbar; read-only for non-owners
- [ ] Practical: file panel + code panel + preview all working

## Vivari
- [ ] `@vivari/core` installed as peer; single copy
- [ ] COOP/COEP on `/` and `/p/*` only; `sw.js` in `public/` with `Service-Worker-Allowed: /`
- [ ] `/admin` and `/api` unaffected by COEP
- [ ] Fonts self-hosted; no remote subresources on playground routes
- [ ] `/vendor` handled or `install={false}` decided

## Deployment
- [ ] Migrations created and committed; workflow applies them to the **remote** D1
- [ ] Workflow pushes runtime secrets to Cloudflare, not only GitHub
- [ ] Build-time `NEXT_PUBLIC_*` provided to the build step
- [ ] Fail-fast env check present; `env.manifest` and `.env.example` match the workflow
- [ ] README lists secrets and the "add a new env" steps

## Final summary must include
Implemented items, what was verified (commands run), deviations with reasons, the exact GitHub secrets list, open questions.
