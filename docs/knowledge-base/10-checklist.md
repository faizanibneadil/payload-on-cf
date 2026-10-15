# 10. Agent checklist (verify before finishing)

## Setup
- [ ] Read AGENTS.md and every skill in `.agents/`
- [ ] Neon/Postgres removed; D1 adapter in use; existing wrangler/payload config preserved
- [ ] `cn` npm package NOT installed; `lib/utils.ts` has shadcn `cn()`
- [ ] No Radix imports anywhere (`grep -R "radix" src package.json`)

## Auth and permissions
- [ ] `auth.loginWithUsername` configured with `allowEmailLogin: false`; Register and Sign-in screens work; logout works
- [ ] Students cannot enter the Payload admin panel (admin role only)
- [ ] `owner` set server-side; update/delete restricted to owner/admin on playgrounds and playground-files
- [ ] Non-owner sees read-only code and theory and gets a Fork button; anonymous Save/Fork goes to login

## Behavior
- [ ] **No autosave** (no debounced writes, no API calls while typing). Save is one server action sending only the diff
- [ ] Unsaved-changes indicator and `beforeunload` warning present
- [ ] Title: live normalization, max 50, unique slug, fallback `untitled-<id>`
- [ ] `/` serves the Playground; `/p/[slug]` shows a saved playground; unknown slug returns 404
- [ ] Share uses `navigator.share` with clipboard fallback
- [ ] Dark theme only (no light theme, no theme toggle, no `next-themes`)
- [ ] Theory read-only for non-owners; code editor, preview and console work; all panels resize; mobile tabs work
- [ ] Monaco, Sandpack and Tiptap are dynamically imported

## Legacy import
- [ ] Old `?playgroundId=&shortURL=` link opens as a draft; first Save creates the playground and deletes the old record; failures are silent

## Deployment
- [ ] Migrations created and committed; workflow applies them to the **remote** D1
- [ ] Workflow pushes runtime secrets to Cloudflare, not only GitHub
- [ ] Build-time `NEXT_PUBLIC_*` provided to the build step
- [ ] Fail-fast env check present; `env.manifest` and `.env.example` match the workflow
- [ ] README lists secrets and the "add a new env" steps

## Final summary must include
Implemented items, what was verified (commands run), deviations with reasons, the exact GitHub secrets list, open questions.
