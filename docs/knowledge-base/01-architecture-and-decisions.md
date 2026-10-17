# 01. Architecture and fixed decisions

## Product
A playground for frontend students (HTML, CSS and JavaScript). Students complete assignments and build small projects in it.

- **Theory panel:** lecture theory written in Tiptap. Editable only by the playground owner.
- **Practice panel:** file explorer + Monaco code editor, sandboxed live preview (multiple tabs) and JavaScript console.
- All panels are resizable. On mobile the panels become bottom tabs (Theory, Files, Code, Preview).

## Fixed decisions (do not change without asking)
| Topic | Decision |
|---|---|
| Framework | Next.js App Router + Payload 3 in the same app |
| Database | Cloudflare D1 (SQLite) |
| Hosting | Cloudflare Worker via OpenNext; deploy through GitHub Actions |
| Auth | Payload `users` collection, **username + password only** (email login disabled). Register and Sign-in screens at `/register` and `/login` |
| Code editor | Monaco (`@monaco-editor/react`), dynamically imported |
| Preview / runtime | Own sandboxed iframe (`srcdoc`) with a postMessage console; Sandpack was replaced |
| Theory editor | Tiptap, dynamically imported |
| Files and folders | `playground-files` collection with `@payloadcms/plugin-nested-docs` (`parent` + `breadcrumbs`) |
| Routes | `/` = Playground (scratch/draft, or legacy import), `/p/[slug]` = a saved playground |
| Saving | Explicit Save only (button or Ctrl/Cmd+S). No autosave |
| UI kit | shadcn/ui on **Base UI** only. No Radix |
| Lint / format | Biome (no ESLint, no Prettier config) |
| Package manager | pnpm |

## Permission matrix (enforced by Payload access control on the server)
| Actor | Read | Edit code | Edit theory | Save | Fork |
|---|---|---|---|---|---|
| Anonymous | yes | local scratch only (not persisted) | no | sign in first | sign in first |
| Signed-in non-owner | yes (read-only) | no | no | no | yes |
| Owner | yes | yes | yes | yes | yes |
| Admin | yes | yes | yes | yes | yes |

A fork is a **new playground owned by the forking student**; its theory is a copy that only the fork's owner can edit.
The old `a=r` / `a=w` URL access modes are gone: sharing is `/p/[slug]` + ownership + access control.

## Save flow
The client keeps a snapshot of the last saved tree. Save sends only the diff (`upserts` + `deletes`) and the theory (only when changed) in one server action. The server validates the final tree, then applies deletes → creates → updates → theory, always with `overrideAccess: false`.

## Legacy URL-state import (isolated in `src/lib/legacy-import.ts`)
Old links look like `/?playgroundId=<record id>&shortURL=<short id>` (owner link) or `/?shortURL=<short id>&a=r` (old share link, looked up by `shortURL`; its record is never deleted).
1. The `/` page fetches the old record from the short-URL service.
2. It builds `index.html`, `styles.css`, `script.js` from that data and opens them as an unsaved draft.
3. On the first Save the new playground is created and, for owner links only, the old record is deleted through the delete API.
4. Any fetch/delete failure is skipped silently. Delete the module (and its two call-sites) when the old links are no longer needed.

## Folder layout
```
src/
  app/(frontend)/            # /, /p/[slug], /login, /register
  app/(payload)/             # Payload admin + API
  collections/               # Users, Playgrounds, PlaygroundFiles, Media
  components/playground/     # PlaygroundIDE, TitleBar, FileExplorer, CodeEditor, PreviewPane, TheoryEditor
  components/ui/             # shadcn (Base UI)
  lib/                       # tree helpers, file rules, server helpers, legacy import, monaco/tiptap helpers
  migrations/                # Payload D1 migrations (committed)
```
