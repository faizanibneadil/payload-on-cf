# 01. Architecture and fixed decisions

> Status: rewritten for the Boards pivot (October 2026). The code editor (Monaco, preview, runtime, terminal, templates, file tree) is removed from the product. Sections marked "target" describe what the iterations in `11-iterations.md` build.

## Product
**Boards**: an infinite canvas for instructors. An instructor prepares an interactive lecture on a board and shares it. For now a board holds only **text blocks with live markdown**. Which further interactivity a lecture gets (drawing, shapes, images, rich text) is decided later in the research iteration, together with the owner.

- A board has a title and a canvas. The owner edits it; everyone else sees it read-only and can only pan and zoom.
- Header: left = product name + board title (owner can edit), right = Save / Share / theme toggle / user menu, or Sign in.

## Fixed decisions (do not change without asking)
| Topic | Decision |
|---|---|
| Framework | Next.js App Router + Payload 3 in one app, on a Cloudflare Worker (OpenNext), D1 and R2 |
| Environments | `main` = production (own D1/R2, never touched during the rebuild). `dev` = test environment with its own D1/R2 (`env.dev` in `wrangler.jsonc`). Secrets such as `PAYLOAD_SECRET` are shared |
| Naming | The saved object is a **Board**: collection `boards`, route `/b/<slug>`, UI text "Board". The old `playgrounds` collection is replaced in Iteration 1 |
| Auth | Payload `users`, username + password only (email login disabled). Username: `a-z`, `0-9`, `_`, 3-20 chars, numeric-only allowed, case-insensitive unique. Password min 8. Sign in / Register in one modal opened from the header. Validation on client and server |
| Roles | `admin` (super admin) and `instructor`. Public registration is open and every self-registered user becomes `instructor`. The old `user` value is migrated to `instructor` |
| Canvas | Own canvas engine (see `05-board-canvas.md`): one transformed layer, viewport culling, pan and zoom. Objects for now: text blocks only |
| Text blocks | Live markdown in our own small block editor: `# `/`## `/`### ` heading, `- ` bullet list, `1. ` numbered list, plain paragraph. Stored as a markdown string per block. No Lexical, no Tiptap, no "/" menu for now (open research item) |
| Storage | One `boards` row holds the whole canvas as JSON (max about 1.8 MB by default; D1 row limit is 2 MB) |
| Saving | One "Save" button. No autosave anywhere. Unsaved-changes indicator and `beforeunload` warning. Save and Share go through plain Payload endpoints (`POST /api/boards/:id/save`, `/share`, `src/collections/board-endpoints.ts`), **not server actions**: server actions are tied to a build, and during a deploy an old page calling a new Worker version makes Next reload the page, which loses unsaved work. Endpoints return the same JSON on every version; on failure the page only shows a message |
| Sharing | No forking. A board is private until the owner turns Share on (`isShared` boolean). Anyone with the link `/b/<slug>` can then open it (no sign-in needed), read-only: pan and zoom only. Only the owner (or admin) can save. Enforced by Payload access control |
| Limits | Instructors: 10 new boards per 24 h and 10 saves per board per 24 h (defaults, kept from the old design; confirm with the owner, who once wrote 14). Values live in a Payload Global (`settings`) editable by the super admin; the Global read is cached in Worker memory for a few seconds and cleared on update. Counters live on the board row (no extra writes). `admin` is exempt |
| Cost control | D1 free plan: 5M rows read/day, 100k rows written/day. Index every filtered column, one row write per Save, no polling. Workers free plan also has 100k requests/day and 10 ms CPU per request |
| Workers plan | **Free plan (owner decision, October 2026).** Over the CPU limit Cloudflare answers "Error 1102: Worker exceeded resource limits". Therefore page reads never load Payload: `src/lib/session.ts` verifies Payload's JWT cookie with `jose` and checks the session with one D1 query; `src/lib/board-reads.ts` reads boards straight from D1 with the same access rule. Payload is only used for writes and auth (save, share, create, sign in, register, admin). Measured in Node: Payload cold start ~55 ms CPU, `payload.auth` ~12-26 ms, `payload.find` ~20-35 ms per call; register (password hashing) ~400 ms and sign in ~100 ms stay heavy and may still hit 1102 now and then on the free plan |
| Caching | **Open decision, decide with the owner after the main features are done.** Boards are read far more often than written (an instructor shares a board with many students), so reads of shared boards must be cached. Candidates: Next.js caching (`"use cache"` / Cache Components, only if it works on the Worker) or Cloudflare caching (Cache API / CDN cache with purge on Save, or KV). Until then: no caching layer, but keep the read path in one place (`getBoardBySlug`) so a cache can be added later without touching callers |
| CI/CD | GitHub Actions only (`.github/workflows/deploy.yml`): a push to `dev` deploys the dev Worker, a push to `main` deploys production. The repo is public, so standard GitHub-hosted runners are free with no minute limit. Cloudflare Workers Builds is not needed (see `07`) |
| Theme | Frontend: shadcn preset `b5rR41Mtnc`, light is the default, light/dark toggle in the header, no flash on load (the choice is stored in a cookie and the server layout renders `<html class="dark">`). The Payload admin panel stays as it is (`admin.theme: 'dark'`) |
| Email | The email adapter config stays, but the `onInit` startup email is commented out |
| Routes | `/` = landing / my boards, `/b/<slug>` = a board. No `/login` or `/register` pages |
| UI kit | shadcn/ui on Base UI only. No Radix |
| Lint / format | Biome (no ESLint). Fix all errors, only the warnings that can break behaviour |
| Package manager | pnpm |

Removed for good (do not bring back without asking): code editor, Monaco, preview iframes, Vivari / Sandpack runtime, terminal, templates, file tree, `playground-files` collection, `nested-docs` plugin, legacy URL-state import, cross-origin isolation headers.

## Permission matrix (server side, Payload access control)
| Actor | Read | Edit board | Save | Limits |
|---|---|---|---|---|
| Anonymous | shared boards only (pan/zoom) | no | no | n/a |
| Signed-in non-owner | shared boards only (pan/zoom) | no | no | n/a |
| Owner (`instructor`) | own boards | yes | yes | yes |
| Admin (super admin) | all | yes | yes | none |

## Data and migrations
- The owner merges `dev` into `main` at the end. Losing old production data on that merge is accepted. Before the merge, export the production D1 as a backup (`wrangler d1 export`).
- Schema changes are new forward migrations (production already has the old migration history); never edit applied migrations.

## Folder layout (target)
```
src/
  app/(frontend)/            # /, /b/[slug]
  app/(payload)/             # Payload admin + API
  collections/               # Users, Boards, Media
  globals/                   # Settings (limits)
  components/shell/          # header, theme toggle, auth modal
  components/canvas/         # canvas engine, text blocks, markdown
  components/ui/             # shadcn (Base UI)
  lib/                       # limits, slug helpers, markdown parser
  migrations/                # Payload D1 migrations (committed)
```
