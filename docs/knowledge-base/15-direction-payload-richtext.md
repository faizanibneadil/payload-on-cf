# 15. Direction change (25 Oct 2026): build the board on Payload's own rich text

> Status: **owner decision, not built yet.** The next session studies the docs below, explains to the owner how it works and what it saves, gives options for every open point, and re-plans the tasks (`13`) before writing code. When this file disagrees with older notes (`01`, `05`, `12` rows before 25 Oct 2026), **this file wins**.

## What the owner said (25 Oct 2026, summary of the owner's words)
1. **Cloudflare Workers paid plan ($5/month) is now in use.** The free-plan rules (10 ms CPU per request, "page reads never load Payload") are no longer hard limits. Paid plan: 30 s CPU per request by default (configurable), 10 million requests/month included; check the current Cloudflare docs before relying on numbers.
2. **Stop building our own Lexical features.** So far the agent installed Lexical separately (`lexical`, `@lexical/*` 0.52) and rebuilt each feature (headings, quote, lists, check list, horizontal rule, indent, toolbar, bold, italic, underline) by hand. Payload already uses Lexical internally for its rich text and **exports its rich text editor, all its features and the Lexical APIs** (package `@payloadcms/richtext-lexical`; the owner called it "payloadcms/richtext-editor", verify the exact name and exports in `node_modules` / the docs). Payload has every feature the owner wants, plus **blocks and inline blocks**. The owner sees the work so far as wasted time and tokens; **use Payload's official APIs and keep the implementation simple.**
3. **Boards collection: the board content must be a Payload `richText` field**, not the current `json` field (`boards.data = { doc }`). The owner wants boards to be **compatible with the Payload admin**: a board must also be viewable (and editable) from the admin side, not only on the frontend.
4. **Study Payload's Rich Text "Views"** properly: https://payloadcms.com/docs/rich-text/views . Then **explain to the owner** how this feature works, how it can make the work easier and how much time it can save. Use it **even if it is experimental**, if it is useful. The owner wants to understand this implementation.
5. **Custom features the Payload way:** https://payloadcms.com/docs/rich-text/custom-features
6. **Blocks the Payload way, exactly like Payload builds them:** https://payloadcms.com/docs/rich-text/blocks
7. This is a **very big change**: the whole test suite and every test case change, and every task in `13-task-tracker.md` changes. It is important to fix it now, because later it would cause problems. The work itself should become much easier, because Payload already implemented it and we only use it.
8. Update the knowledge base properly, so no future agent faces any issue (this file, `12`, `13`, `14`, `01`).

## What this replaces (older owner decisions now superseded or reopened)
| Older note | Now |
|---|---|
| "Payload's `richtext-lexical` is only the model for how features work; we do not use its UI or admin components" (`05`, `12`) | Superseded: use Payload's rich text package itself (features, blocks, APIs). How much of its **UI** shows on the frontend is an open question (below) |
| "Storage: `boards.data = { doc }` JSON field, own `validateDocument`; Payload's `richText` field not used (heavy for free-plan CPU)" (`01`, `05`) | Superseded: board content = Payload `richText` field (paid plan). Validation = Payload's own |
| "Free plan only; page reads never load Payload" (`01`, `12` rule 6) | Superseded: paid plan. Whether the fast read path (`src/lib/session.ts`, `src/lib/board-reads.ts`) stays is an open question |
| "No drawer for block settings; small popup next to the block, our own UI" (`12`) | Reopened: the owner wants blocks "like Payload builds them" (Payload uses a drawer/inline form). Ask |
| "No fixed toolbar; inline toolbar only" (`12`) | Reopened: Payload has both a fixed and an inline toolbar (configurable). Ask which one(s) |
| Iteration B/C tasks (own features, `13`) | All tasks to be re-planned around Payload features |

Decisions that still stand unless the owner changes them: one Lexical document per board; Save button (no autosave) on the frontend; sharing rules; limits; light/dark theme; shadcn on Base UI for our own UI; Roman Urdu comments, English commits; no surprises (options first); tests for every feature; owner merges; never touch `main` or production data.

## What exists today (state at the end of the session of 24-25 Oct 2026)
- `dev` = `8c31e44`. Deployed on dev: everything up to C4 (underline).
- Own editor code to be replaced: `src/components/editor/` (`board-editor.tsx`, `features/*`, `slash-menu/*`, `inline-toolbar/*`, `theme.ts`, `editor-loader.tsx`), server read view `src/components/read-view/document-view.tsx`, `src/lib/document.ts` (`validateDocument`, limits, `TEXT_FORMAT_BITS`), CSS in `src/app/globals.css` (`board-*` classes), packages `lexical` + `@lexical/*` 0.52 in `package.json`.
- Storage: `boards.data` is a `json` field holding `{ doc: SerializedEditorState }` (Lexical JSON). The A3 migration `20261023_220000_delete_canvas_boards` deleted old canvas boards. The stored JSON is plain Lexical JSON (root > paragraph/heading/quote/list/listitem/horizontalrule/text/linebreak/tab), very close to what Payload's richText stores.
- Save/Share go through `src/collections/board-endpoints.ts` (`POST /api/boards/:id/save`, `/share`); board page `src/app/(frontend)/b/[slug]/page.tsx`; state `src/components/board/board-store.tsx`.
- Tests: `tests/e2e/editor/*.spec.mjs` (one per feature), `tests/int/*` (document validation, features, slash menu, toolbar). Most editor tests will be rewritten.
- Payload `3.90.2` (check whether `@payloadcms/richtext-lexical` is already installed, and which Lexical version it pins; our separate `lexical` 0.52 may clash).

## Questions the next session must answer with the owner (options + recommendation, then the owner's answer)
1. **Frontend editing:** is the board edited on the frontend with Payload's rich text editor (its own UI and toolbars), only in the admin, or both? What does "Rich Text Views" give here (study the docs first)?
2. **Frontend reading (visitors):** Payload's server-side converters (`@payloadcms/richtext-lexical/react` `RichText` / JSX converters) vs our current read view.
3. **Which Payload features** to enable (Payload's defaults vs a chosen list; e.g. upload/relationship/link to internal docs, tables (experimental), text state colours, align, indent, sub/superscript, inline code, checklist, horizontal rule, blocks, inline blocks).
4. **Toolbars:** fixed, inline, or both; slash menu (Payload's).
5. **Blocks:** the first blocks (Code block, Canvas later) and their settings UI (Payload's drawer).
6. **Data migration:** existing dev boards (`data.doc`) to the new `richText` field (convert or delete; production boards are deleted anyway on the dev->main merge, `01`).
7. **Save flow:** keep our Save button + `/save` endpoint on the frontend, or Payload's form/save (and versions/drafts?).
8. **Fast read path:** keep `src/lib/board-reads.ts` (direct D1) or read with Payload now that the plan is paid.
9. **Removing our code:** delete our own editor, features, slash menu, toolbar, read view, `validateDocument` and the `@lexical/*` packages once the Payload editor replaces them (and which tests go).
10. **Tasks:** a new task list in `13` (small tasks, one feature per task, branch + PR per task, owner merges).

## How the next session should work
1. Read `AGENTS.md`, `12`, this file, `14`, `13`, `01`, `05`, `07` (in this order), and the Payload skill `.agents/skills/payload/` (rich text reference).
2. Study, from the official docs and the installed package (types in `node_modules/@payloadcms/richtext-lexical/dist`): rich text overview, **views**, custom features, blocks, converters (JSX/HTML), the `richText` field config, and the Lexical version Payload pins.
3. Explain to the owner in Roman Urdu: how Payload's rich text and Views work, what it gives us for free, what gets removed, how much time it saves, risks (experimental parts, bundle size on the Worker, admin vs frontend).
4. Ask the questions above (options + recommendation), record every answer in `12` and here.
5. Write a new plan and task list in `13`; then build task by task with the usual flow (branch, tests, PR, owner merges, Actions run watched, owner checks on dev).

## Open CI issues found at the end of the session (fix only with the owner's OK)
- `auth-boards.spec` flake: the job log (thanks to CI2) shows the local test server (`wrangler dev` 4.116) itself exiting with an empty `✘ [ERROR]` after two `403` errors in the admin part; the test then waited 21 minutes. Wrangler suggested 4.152. Options to give the owner: upgrade wrangler; restart the server on a failed health check; split the admin part out of that spec.
- `inline-toolbar.spec` "The toolbar shows in dark mode too" failed once in CI (passes locally): the agent's own check is flaky. This spec will be replaced by the Payload editor anyway.
- Run `40188694167` (merge of PR #44, CI-only change) is red; the deploy was skipped, the app on dev is unchanged (C4 was deployed by the earlier re-run of run `40183579292`).
