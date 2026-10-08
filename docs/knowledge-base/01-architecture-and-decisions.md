# 01. Architecture and fixed decisions

## Product
A playground for HTML/CSS/JS, React and Next.js. Two panels: **Theory** (rich text notes, Payload Lexical) and **Practical** (Vivari in-browser code environment: file panel + code panel + live preview).

## Fixed decisions (do not change without asking)
| Topic | Decision |
|---|---|
| Framework | Next.js App Router + Payload 3 in the same app |
| Database | Cloudflare D1 (SQLite). Not Neon/Postgres |
| Hosting | Cloudflare Workers via OpenNext; deploy through GitHub Actions |
| Auth | Payload `users` collection, username + password only, no registration screen |
| Login UI | Payload's official admin login screen (`/admin/login`) |
| Default tab | **Practical** |
| Saving | **No autosave anywhere.** Persist only when the user clicks Save |
| Playground URL | `/p/[slug]` |
| UI kit | shadcn/ui on **Base UI** only. No Radix |
| Slug rules | `[a-z0-9-]`, spaces become `-`, max 50, unique (DB + frontend) |
| Sharing | `navigator.share`, fallback to clipboard |
| Edit rights | Only the owner edits/saves; others fork to save |

## Permission matrix
| Actor | Read playground | Edit theory | Edit code locally | Save to this playground | Fork |
|---|---|---|---|---|---|
| Anonymous | yes | no | yes (not persisted) | no | redirect to login |
| Logged-in non-owner | yes | no | yes (not persisted) | no (Save becomes Fork) | yes |
| Owner | yes | yes | yes | yes | yes |
| Admin | yes | yes | yes | yes | yes |

Enforce on the **server** (Payload access control + route handlers). UI hiding is cosmetic only.

## Save flow (single request)
Header Save collects `{ title, slug, theory (Lexical JSON), files (Vivari file tree) }` from local state and sends one update request. No debounced writes, no background sync, no API calls while typing in the editors. The only network call tied to typing is none; the slug availability check runs on Save only.

## Fork flow
1. Anonymous: redirect to login.
2. Logged in: create a new playground (owner = current user) copying theory + the *current in-browser* files, title `<original>-fork` (numeric suffix if taken), set `forkedFrom`, redirect to `/p/<new-slug>`.

## Suggested folder layout
```
src/
  app/
    (frontend)/
      page.tsx                 # landing, anonymous local playground
      p/[slug]/page.tsx        # public playground
      layout.tsx
    (payload)/                 # Payload admin + API routes (template default)
  collections/
    Users.ts
    Playgrounds.ts
  lib/
    slug.ts                    # ONE shared normalize/validate function
    utils.ts                   # shadcn cn()
  components/
    ui/                        # shadcn (Base UI) components
    playground/                # header, tabs, title field, toolbar, theory editor, practical panel
  payload.config.ts
```
