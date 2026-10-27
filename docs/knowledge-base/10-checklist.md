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
- [ ] Light theme only in the app (no dark theme, no theme toggle, no `next-themes`); Payload admin stays dark
- [ ] Theory read-only for non-owners; code editor, preview and console work; all panels resize; mobile tabs work
- [ ] Monaco and Tiptap are dynamically imported (the sandboxed preview also loads lazily)
- [ ] Panels: Theory/Files/Code/Preview collapse to a 40px rail, dragging below min collapses, Code or Preview always stays open (see `11-panel-layout.mdx`)
- [ ] Preview supports up to 10 tabs, each with its own address bar and console; mobile shows a dropdown
- [ ] Theory uses a bubble toolbar and a "/" menu; read-only users see no toolbar

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
