# 14. Session handoff (state as of 24 October 2026, third session: B8)

Read this together with `12-owner-rules-and-learnings.md` (owner rules, every past correction) and `13-task-tracker.md` (what is next) before doing anything.

## Where the project stands
- **Direction changed (owner, October 2026):** the board is no longer an infinite canvas; it is one Lexical document (`05-board-editor.md`). Work is split into small tasks (`13-task-tracker.md`).
- Done and verified: Iterations 0, 0b, 1, 2 (accounts, boards, Save/Share/limits); the Playwright Test setup; Iteration A (A1-A3); B1 slash menu, B2 headings (+ fix: no line under H2), B3 quote, B4 unordered list. All merged into `dev` and deployed (last deploy green, commit `97be861`).
- **B5 numbered list** done (PR #31 + Tab nesting fix PR #32, deployed `bd48e5a`, owner verified).
- **B6 check list** done (PR #33, deployed `6bc331f`, owner verified).
- **B7 horizontal rule** done (PR #34 + slash search fix PR #35, owner verified on dev).
- **B8 indent** done (PR #39, owner tested live). **B9 alignment** moved into C10 (owner: toolbar first; decisions in `12`).
- **C1 toolbar shell**: branch `task/c1-toolbar-shell`, PR into `dev`. It shows no toolbar until a feature has a button; **C2 Bold** follows right away as its own PR, the owner checks C1 + C2 together.
- **CI1** done (PR #36 + ffmpeg fix PR #37): the whole suite runs in GitHub Actions before every deploy on `dev` and `main` (unit, lint, tsc, browser suite in 4 parallel shards on the runner's preinstalled Chrome); about 8 min merge to deploy; last run green (`5134aa6`). Locally only the tests of the changed modules (`12`, rules 3, 5, 10).
- Open PRs: C1 toolbar shell, C2 Bold (branch built on top of C1; merge C1 first).
- **Next: after the owner checks C1 + C2 on dev, C3 Italic** (then C4-C11). A format task = a feature file with `textFormats: ['<format>']`, its markdown transformers, a `toolbar` item in the `format` group; add its bit to `TEXT_FORMAT_BITS` in `src/lib/document.ts`, its class to `theme.text`, its tag to the read view's `text` renderer; tests like `bold.spec.mjs`. C3 also adds Payload's bold-italic transformers (`***`, `___`).
- Open owner decisions: E (boards per day, now 10), F (`*.devslix.com` wildcard; prod workers.dev URL allowed or not), Code block settings (before F4).

## How a task is done (pattern used for B2-B7)
1. Read Payload's feature source (sparse clone, below) for behaviour, label, slash group, keywords, markdown transformer.
2. Add `src/components/editor/features/<name>.ts` (nodes, `markdown`, `slashMenu`, `plugins`) and list it in `features/index.ts`.
3. Add the node rule in `src/lib/document.ts` (`NODE_RULES`), the renderer in `src/components/read-view/document-view.tsx`, the classes in `src/components/editor/theme.ts` (editor and read view share them).
4. If the feature replaces a temporary guard in `NotYetPlugin` (`board-editor.tsx`; B8 removed the indent block, B9 removes the alignment block, iteration C the text format block) remove that guard and update the tests that checked it (e.g. `basics.spec`, B8 updated `list-tab.spec`).
5. Tests (run locally only these and the specs of touched modules; the whole suite runs in Actions): unit (`tests/int/editor-features.int.spec.ts`, `tests/int/document.int.spec.ts`) and one e2e spec `tests/e2e/editor/<name>.spec.mjs` (shortcut, Enter/Backspace, slash menu, undo, paste, look, Save + reload, visitor same look/positions, server rejection, dark screenshot).
6. Anything the owner did not decide (look, label, behaviour that differs from Payload) -> ask first with options (owner rule; e.g. quote look was asked).
7. Docs in the same branch: tracker row, `05-board-editor.md` "as built" section, learnings in `12` if the owner decided something, this file.

## How to work here
- Flow per task (standing rule 9 in `12`): branch `task/<id>-<name>` from the latest `dev`, push it, open a PR into `dev`; the owner merges; GitHub Actions runs the whole suite and then deploys dev (about 10-12 min); watch that run (rule 10: a red run is reported after the current work and fixed only with the owner's OK); the owner checks; mark the task `done`.
- Tests (owner, task CI1): locally only the task's spec(s) and the specs of the modules the change touches (`CHROMIUM_PATH=/opt/pw-browsers/chromium BUILD=1 pnpm exec playwright test tests/e2e/<spec> ...`), plus `pnpm test:int`, `pnpm lint`, `pnpm exec tsc --noEmit`. **Never the whole browser suite locally**; it runs in GitHub Actions after the merge, before the deploy (`07`). A single CI shard can be reproduced with `pnpm exec playwright test --shard=N/4`. Report: `pnpm test:e2e:report`.
- Local server alone: `bash tests/e2e/server.sh start-fresh` (http://127.0.0.1:8787, admin/admin), `bash tests/e2e/server.sh stop`.
- Deploy runs: `curl https://api.github.com/repos/faizanibneadil/payload-on-cf/actions/runs?branch=dev` and the GitHub MCP `get_job_logs`.
- Docs-only commits (`docs/**`, `*.md`) do not deploy.
- Payload's Lexical features (model for every editor task): sparse clone `git clone --depth 1 --filter=blob:none --sparse https://github.com/payloadcms/payload`, then `git sparse-checkout set packages/richtext-lexical/src/features/<feature>` (e.g. `blocks`, `toolbars`, `textState`, `format`, `align`, `indent`, `link`, `experimental_table`). Read it into the scratchpad, never into the repo.

## Environment pitfalls (cloud session)
- Never run `pkill -f` with a pattern that also appears in your own command line: it kills the shell (exit 144). `tests/e2e/server.sh stop` is safe.
- Blocked hosts: `*.workers.dev` (cannot open the dev site directly), `ui.shadcn.com` (read shadcn docs/components from a sparse clone of `https://github.com/shadcn-ui/ui`, e.g. `apps/v4/registry/bases/base/ui/code-block.tsx`).
- Playwright's own browser is not installed: always pass `CHROMIUM_PATH=/opt/pw-browsers/chromium`. Playwright MCP needs `PLAYWRIGHT_MCP_SANDBOX=false` and `PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium` in this container.
- Headless typing is faster than a person: after selection-changing keys and before Enter in a menu, tests wait 50-100 ms.
- Headless clicks are faster than a person too: after a block (e.g. a horizontal rule) is selected, Lexical moves the cursor to clicked text on `selectionchange`, which a Playwright `click()` (mouse down and up at once) beats, so the cursor seems not to move. Use a click with ~100 ms between mouse down and up (`humanClick` in `horizontal-rule.spec.mjs`); a real click works with one press.
- Keyboard handlers on `document`: Shift+Tab sends a lone `Shift` keydown first; ignore modifier keys before deciding "another key was pressed" (B8 `EscapeTabPlugin` bug found this way). Lexical commands with the same priority run in registration order, and `RichTextPlugin` registers first, so a handler that must see a key RichText also handles (e.g. Escape at `COMMAND_PRIORITY_EDITOR`) needs a higher priority and must return `false`.
- Lexical's `TabIndentationPlugin` handles `INDENT_CONTENT_COMMAND` at CRITICAL priority for every block, list items included: its `maxIndent` (checked as `new indent < maxIndent`) is the only nesting limit since B8; a guard at a lower priority never runs.
- `node_modules` may be missing in a fresh container: run `pnpm install` first.
- Running `pnpm payload migrate` a second time on the local DB stops at a "data loss" prompt, because `pnpm seed:admin` adds a dev marker row (`payload_migrations`, batch -1). Delete that row first; CI is not affected (production mode).
- Playwright's download CDN (`cdn.playwright.dev`) is blocked in the cloud session (403); locally the browser and ffmpeg come from `/opt/pw-browsers`. In GitHub Actions the e2e job uses the runner's Chrome and installs only Playwright's `ffmpeg` (videos for failure reports).
- GitHub Actions: run list `curl https://api.github.com/repos/faizanibneadil/payload-on-cf/actions/runs?branch=dev`, jobs `.../actions/runs/<id>/jobs`; logs with the GitHub MCP `get_job_logs` (`run_id` + `failed_only: true`).
- Known flake (24 Oct 2026, task B4): in two of four full runs `auth-boards.spec` (always the first spec) failed once with the local server going away (`ERR_CONNECTION_REFUSED` on `/admin`) and once with the register dialog not opening (page not hydrated within 5 s); alone it passed 3/3 and the next full run passed 7/7. Not related to the editor code (that spec never loads it). Re-run once; if it fails again, investigate the local workerd, not the app.
- Dev D1 id `d7951b74-a34d-4a5f-a544-ef4f2e9a6004`. Production D1/R2 and `main` are never touched.

## Key code map
- Board page: `src/app/(frontend)/b/[slug]/page.tsx`; board state and Save: `src/components/board/board-store.tsx`, `src/collections/board-endpoints.ts`, `src/collections/Boards.ts`.
- Fast read path (free plan CPU): `src/lib/session.ts`, `src/lib/board-reads.ts`.
- Origins per environment: `wrangler.jsonc` `vars` + `src/payload.config.ts`.
- Editor: `src/components/editor/` (`features/` one file per feature: nodes, markdown shortcuts, slash menu items, listed in `features/index.ts`; `board-editor.tsx` Lexical + plugins, `editor-loader.tsx` lazy chunk, `theme.ts` classes shared with the read view). Read view: `src/components/read-view/document-view.tsx` (server). Document model and validation: `src/lib/document.ts` (each new node type adds a rule there and a renderer in the read view).
