# 01. Architecture and fixed decisions

> Status: rewritten for the rebuild (October 2026). Sections marked "target" describe what the iterations in `12-iterations.md` build. Anything in files 02-11 that contradicts this file is outdated until its iteration updates it.

## Product
A playground for frontend students and teachers. Teachers prepare lectures on an infinite canvas (theory) and present them; students practise in an editor with a live preview.

- **Theory tab:** infinite canvas with free-placed text blocks (Lexical, markdown shortcuts, "/" block menu incl. code blocks for TypeScript, JavaScript, HTML, CSS), drawing tools and images. Editable only by the playground owner.
- **Editor tab:** VS Code-style UI and UX (no extensions): file explorer, Monaco editor, multiple preview tabs, JS console, and a terminal only where a runtime needs it.
- **Both tab:** theory and editor side by side in resizable panels (desktop and tablet only).
- Header: left = product name + playground title (owner can edit), center = Theory | Editor | Both, right = Save / Share / user menu, or Sign in.

## Fixed decisions (do not change without asking)
| Topic | Decision |
|---|---|
| Framework | Next.js App Router + Payload 3 in one app, on a Cloudflare Worker (OpenNext), D1 and R2 |
| Environments | `main` = production (own D1/R2, never touched during the rebuild). `dev` = test environment with its own D1/R2 (`env.dev` in `wrangler.jsonc`). Secrets such as `PAYLOAD_SECRET` are shared |
| Auth | Payload `users`, username + password only (email login disabled). Username: `a-z`, `0-9`, `_`, 3-20 chars, numeric-only allowed, case-insensitive unique. Password min 8. Sign in / Register in one modal opened from the header. Validation on client and server. Roles: `admin` (super admin) and user |
| Theory editor | Custom editor built on the Lexical packages that Payload re-exports (`@payloadcms/richtext-lexical`). No separate Lexical install and no Tiptap. Styled with shadcn typeset. A spike must confirm it runs outside Payload's form context; fallback is installing `lexical` directly |
| Canvas | Own scene model (JSON objects + viewport), Lexical text blocks in the DOM, shapes in SVG. Moveable + Selecto (MIT) for drag, resize, rotate, snap, group and multi-select; alignment tools and group/ungroup are ours. Tools: select, hand, pen, rectangle, circle, arrow, line, text, eraser; undo/redo; image paste (owner only, stored in R2) |
| Code editor | Monaco, dynamically imported. No auto-closing or auto-renaming of tags |
| Runtime | Vivari (`@vivari/core`, MIT) for React and Next.js templates, with a real terminal. Vanilla (HTML/CSS/JS) runs in a sandboxed iframe with no terminal. Sandpack is not used. Needs cross-origin isolation headers on the playground pages only (not `/admin` or `/api`). If the runtime cannot boot, the editor stays usable and Run is disabled with a clear message |
| Templates | Vanilla, React, Next.js. Chosen when the playground is created; the playground starts with that template's boilerplate. Next.js is labelled beta |
| Storage | One `playgrounds` row holds the whole file tree and the canvas as JSON (max about 1.8 MB by default; D1 row limit is 2 MB). Only source files are saved, never `node_modules`, `.next` or build output. `nested-docs` and the per-file collection are dropped |
| Saving | One "Save all" button saves canvas and code together. No autosave anywhere. Unsaved-changes indicator and `beforeunload` warning |
| Sharing | No forking. A playground is private until the owner turns Share on (`isShared` boolean). Anyone with the link `/p/<slug>` can then open it (no sign-in needed): theory read-only, code editable locally with preview, but never saved to the server. Visitor edits are stored only in the visitor's browser, keyed by slug and user id, with a "Reset to original" button. Only the owner (or admin) can save. Enforced by Payload access control |
| Limits | Students: 10 new playgrounds per 24 h and 10 saves per playground per 24 h. Values live in a Payload Global (`settings`) editable by the super admin; the Global read is cached in Worker memory for a few seconds and cleared on update. Counters live on the playground row (no extra writes). `admin` is exempt |
| Cost control | D1 free plan: 5M rows read/day, 100k rows written/day. Index every filtered column, one row write per Save, no polling. Workers free plan also has 100k requests/day and 10 ms CPU per request |
| Caching | Next.js Cache Components stay off by default. A spike decides whether `"use cache"` works on the Worker; if not, it is skipped |
| Theme | shadcn preset `b5rR41Mtnc`. Light is the default. Light/dark toggle at the bottom of the primary bar. Monaco, canvas and terminal follow the theme |
| Routes | `/` = playground (scratch draft, or legacy import), `/p/<slug>` = a saved playground. No `/login` or `/register` pages |
| UI kit | shadcn/ui on Base UI only. No Radix |
| Lint / format | Biome (no ESLint). Fix all errors, only the warnings that can break behaviour |
| Package manager | pnpm |

## Permission matrix (server side, Payload access control)
| Actor | Read | Edit theory | Edit code and run preview | Save | Limits |
|---|---|---|---|---|---|
| Anonymous | shared playgrounds only | no | locally only | no (sign in first) | n/a |
| Signed-in non-owner | shared playgrounds only | no | locally only | no | n/a |
| Owner | own playgrounds | yes | yes | yes | yes |
| Admin (super admin) | all | yes | yes | yes | none |

## Legacy URL-state import (keep, isolated in `src/lib/legacy-import.ts`)
Old links look like `/?playgroundId=<record id>&shortURL=<short id>` (owner link) or `/?shortURL=<short id>&a=r` (old share link, never deleted). `/` fetches the old record from the short-URL service, builds the starter files from it as an unsaved draft, and on the first Save creates the new playground and, for owner links only, deletes the old record. Any fetch or delete failure is skipped silently. Delete the module and its call-sites when old links are no longer needed.

## Data and migrations
- The owner merges `dev` into `main` at the end. Losing old production data on that merge is accepted. Before the merge, export the production D1 as a backup (`wrangler d1 export`).
- Schema changes are new forward migrations (production already has the old migration history); never edit applied migrations.

## Folder layout (target)
```
src/
  app/(frontend)/            # /, /p/[slug]
  app/(payload)/             # Payload admin + API
  collections/               # Users, Playgrounds, Media
  globals/                   # Settings (limits)
  components/shell/          # header, primary bar, tabs, auth modal
  components/canvas/         # canvas engine, Lexical blocks, drawing tools
  components/editor/         # explorer, Monaco, preview tabs, terminal
  components/ui/             # shadcn (Base UI)
  lib/                       # limits, tree helpers, legacy import, runtime
  migrations/                # Payload D1 migrations (committed)
```
