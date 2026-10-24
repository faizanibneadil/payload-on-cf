# 12. Owner rules and learnings (read before every task)

Every correction or instruction from the owner is recorded here, with what it means for later work, so the same mistake is not made twice and earlier features are not broken. Add a line every time the owner corrects or asks for a change. When this file disagrees with older notes, this file wins (newest owner word).

## Standing rules
1. **No surprises.** Build only what the owner asked for. When something is not specified (behaviour, design, naming, limits, workflow, tools, libraries), do not decide it alone: give the owner options (with a recommendation and trade-offs) and wait for the answer. Small internal details that the owner never sees (variable names, file split) are fine to decide.
2. **Keep learnings.** Each owner request is a learning: write it down here and follow it in all later work.
3. **Nothing breaks.** A change to one feature must keep the earlier owner requests working. Locally, before the push, run only the task's own spec(s), the specs of every module the change touches, plus `pnpm test:int`, `pnpm lint` and `pnpm exec tsc --noEmit` (a few seconds each); **never the whole browser suite locally** (owner, October 2026: it costs time and session usage). The whole suite runs in GitHub Actions after the owner merges, before every deploy (`07`).
4. **Test and report.** Every task has its own tests (every tool and every component), and ends with real-browser testing, screenshots and a pass/fail report (`09-checklist.md`). While working, run only the tests of the task and of the modules it touches (rule 3).
5. **Fast development.** Nothing may slow down the push-to-deploy cycle or eat into free limits without the owner's OK. The whole test suite runs in GitHub Actions on every push to `dev` and `main` (owner, October 2026, task CI1): unit tests, lint, typecheck and the browser suite in 4 parallel shards; the deploy job runs only when all of them pass.
10. **Watch the Actions run after every merge.** After the owner merges, follow the run on `dev` (tests, then deploy). When it is red, finish the current work first, then tell the owner, the usual way, which job failed, why, and that the deploy is stopped; fix it only after the owner allows it (a new task branch and PR).
6. Stay on the Cloudflare Workers **free plan** (10 ms CPU per request). GitHub Actions only.
7. Code comments in Roman Urdu; commits and PR text in English. Never touch `main` or production D1/R2.
8. Reply to the owner in Roman Urdu.
9. **Work flow (owner, October 2026):** small iterations, one feature = one task (e.g. bold is one task, italic another). Per task: branch `task/<id>-<name>` from the latest `dev` -> build + tests -> push the branch -> open a PR into `dev` -> the **owner merges** (the agent never merges and never pushes to `dev` directly) -> CI deploys dev -> the owner checks on dev -> the agent marks the task `done` in `13-task-tracker.md` -> next task. The next iteration starts only after the owner verified the previous one. Ask the owner whenever something is unclear.

## Learnings (owner requests, newest last)
Canvas-specific learnings (resize, borders, text scale, click-to-type, auto width) were removed together with the canvas (October 2026); they are in git history if the canvas comes back.

| Date | Owner said | What it means from now on |
|---|---|---|
| Oct 2026 | Boards for instructors, the old code editor removed completely | No Monaco, Vivari, preview, templates unless the owner brings them back |
| Oct 2026 | Logout/refresh broke on dev, fix before moving on | Bugs found on dev come before new features |
| Oct 2026 | Free plan only | Page reads never load Payload (`09-checklist.md`, "Free plan CPU") |
| Oct 2026 | Live-check made every push slow | CI must stay fast; heavy checks never run per push |
| Oct 2026 | No surprises; keep learnings | This file; options before any unasked decision |
| Oct 2026 | Emoji library and typography later, decided together | Do not add emoji or font changes on my own |
| Oct 2026 | Keep the browser test files in the repo | Suites live in `tests/e2e/` (Playwright Test); `pnpm test:e2e` runs all of them |
| Oct 2026 | CORS/CSRF per environment: dev URL and `lecture.devslix.com` | Origins in `wrangler.jsonc` `vars` (`SERVER_URL`, `ALLOWED_ORIGINS`); wildcard is open choice F |
| Oct 2026 | Product goal: instructors design proper lectures. AI that helps design lectures only after the product is ready and has feedback | No AI features now; keep the document format clean and documented so AI can produce it later |
| Oct 2026 | Lexical, same family as Payload | The editor is Lexical (`05-board-editor.md`) |
| Oct 2026 | Do not bring in outside services or domains the owner does not have | Everything runs inside this project (Worker, D1, R2) |
| Oct 2026 | Keep Payload's `media` collection and R2 configuration; do not touch them | Never change `media` / R2 setup unless asked |
| Oct 2026 | **Big change:** "a lecture can contain drawings, but a drawing is not a lecture". The board is no longer an infinite canvas: a board is one Lexical editor | `01`, `05-board-editor.md`. The infinite canvas code, files, tests and docs are removed (git history keeps them). A canvas comes back later, built from scratch, as a block and an inline block |
| Oct 2026 | No fixed toolbar; only an inline toolbar on the selection with Payload's features: bold, italic, underline, strikethrough, superscript, subscript, inline code, paragraph, headings, quote, alignment, indent, bulleted / numbered / check list, horizontal rule, tables, text state | `05-board-editor.md`. Headings H1-H6 |
| Oct 2026 | Blocks and inline blocks the way Payload does them: Lexical nodes inside the same JSON, chosen from the `/` menu under the categories "Blocks" and "Inline blocks" | Blocks: Canvas, Code block. Inline blocks: Canvas. No drag handle |
| Oct 2026 | No drawer for block settings; a small popup next to the selected block, like the inline toolbar. Our own UI, not Payload's | Payload is only the model for how the feature works, never for its UI |
| Oct 2026 | Links with full functionality (instructors share external links) | Label, URL, new tab, `rel`, hover/focus popover with Edit/Remove; visitors can click links, only the owner changes them |
| Oct 2026 | Text state colours: Payload's `defaultColors`; markdown shortcuts like Payload's Lexical editor | `05-board-editor.md` |
| Oct 2026 | Horizontal / vertical board layout: not wanted, removed | No layout option anywhere (docs, tasks, code) |
| Oct 2026 | Presentation mode: skip | Removed from the docs and the backlog |
| Oct 2026 | Old infinite-canvas boards get no support; delete them | The migration of task A3 deletes those board rows (dev now; production too when `dev` is merged into `main`) |
| Oct 2026 | Remove the live-check (no benefit) | Task A2 removes the script, the workflow, the spec and the `[live-check]` hook |
| Oct 2026 | Tests matter: a test for every tool and component, kept in good order; but do not re-run every suite at every small step | Standing rule 4 |
| Oct 2026 | Small iterations, one feature per task, branch + PR, owner merges, task tracker | Standing rule 9, `13-task-tracker.md` |
| Oct 2026 | (B2 check) A line appeared under H2 headings; remove it, no OK until fixed | No decorative lines/borders under headings or text that the owner did not ask for; a look copied from a style kit (shadcn typography) is still a decision to show the owner first |
| Oct 2026 | Quote look: a thin line on the left, indented, italic; slash menu label "Blockquote" (Payload's) | `05-board-editor.md` (Quote) |
| Oct 2026 | (B5) Numbered list: slash label "Ordered List" (Payload's); nested levels like Payload (1. A. a. I. i.); the typed number is the start number (`3. ` starts at 3) | `05-board-editor.md` (Ordered list) |
| Oct 2026 | Full local test runs cost time and Pro plan usage. Locally test only what the change touches; the whole suite runs in GitHub Actions after the merge, before the deploy (dev and main), in 4 parallel shards. Watch the Actions run, report a red run after finishing the current work, fix only with the owner's OK. This is the standard for this and every later session | Standing rules 3, 5, 10; `.github/workflows/deploy.yml`; `07`, `09`, `14` |
| Oct 2026 | (CI1 review) Do not install a browser in GitHub Actions on every run (slow); use the browser the Ubuntu runner already has | `deploy.yml` uses the preinstalled Google Chrome; in CI prefer what the runner image already ships over downloads |
| Oct 2026 | (B7 check) `/ul` showed Horizontal Rule first ("r-ul-e"); Horizontal Rule must come from `/hr`. Owner chose: the slash search matches from the start of a label, keyword or word, not from the middle | `src/components/editor/slash-menu/slash-menu-items.ts`; applies to every slash item, now and later. Check new keywords against the other items' searches (e.g. `/ul`, `/ol`, `/par`) in every task |
| Oct 2026 | (B7) Horizontal rule: slash label "Horizontal Rule" in Basic (Payload's); look like Payload (2 px light grey line, ~12 px space, ring when selected) | `05-board-editor.md` (Horizontal rule) |
| Oct 2026 | (B6) Check list: slash label "Check List" (Payload's); ticked item like Payload (filled box with a tick, text struck through); visitors only look at the owner's ticks, they cannot tick | `05-board-editor.md` (Check list) |
| Oct 2026 | (B5 check) Nested lists could not be made with Tab; fix it before moving on | List items nest with Tab / Shift+Tab now (not waiting for B8). A list (or any structure) must be fully usable from the keyboard when its task is done; test the keys a user expects (Tab, Shift+Tab, Enter, Backspace) in every list/text task |

## Open choices (need the owner's answer)
- **E. Boards per day:** default stays 10 (owner once wrote 14 and once "1 board per day"). Editable by the admin in the `settings` Global.
- **F. `*.devslix.com`:** Payload only matches exact origins (no wildcard). Options: list each domain in `ALLOWED_ORIGINS` (current, simple, safe); a small custom check that accepts any `https://<name>.devslix.com` (touches Payload internals, must be re-checked on Payload upgrades); or one variable per environment that the owner edits in the Cloudflare dashboard. Also open: should the production workers.dev URL be allowed too (today only lecture.devslix.com)?
- **Code block settings (before task F4):** recommendation = language + optional file name; copy button and line numbers always on.

## Regression protection
Browser tests run on the Playwright Test runner (`playwright.config.ts`, specs in `tests/e2e/`):
- `auth-boards.spec.mjs` (accounts, boards list), `save-share.spec.mjs` (Save, Share, limits); editor features get one spec per feature under `tests/e2e/editor/` (`basics.spec.mjs` A3, `slash-menu.spec.mjs` B1, `headings.spec.mjs` B2, `quote.spec.mjs` B3, `unordered-list.spec.mjs` B4, `ordered-list.spec.mjs` B5, `list-tab.spec.mjs` B5 fix, `check-list.spec.mjs` B6, `horizontal-rule.spec.mjs` B7). Unit tests (document validation, converters) in `tests/int/` (`document.int.spec.ts`, `slash-menu.int.spec.ts`, `editor-features.int.spec.ts`).
- CI (task CI1): `.github/workflows/deploy.yml` runs `checks` (unit, lint, tsc) and `e2e-build` (Worker build, uploaded as an artifact) in parallel, then `e2e` (4 shards, `playwright test --shard=N/4`, the runner's preinstalled Google Chrome via `CHROMIUM_PATH`), then `deploy`. On a failed shard the run keeps the HTML report, screenshots, videos, traces and server logs as the artifact `e2e-report-shard-N` (7 days).
- `pnpm test:e2e` builds the production Worker if needed (`BUILD=1` forces it), gives each spec file a fresh local database (`tests/e2e/server.sh`, only `.wrangler/state`, never dev or production) and runs everything with one worker.
- Every check is listed in the HTML report (`pnpm test:e2e:report`, annotations pass/FAIL). On a failure the report has the screenshot, a video of every browser window (`tests/e2e/contexts.mjs`) and a trace (each step, network, console). Passing tests keep no videos.
- When an owner request changes behaviour, update the matching checks in the same commit.
- Playwright MCP (`.mcp.json`, `@playwright/mcp@0.0.83`) lets the agent drive a browser while debugging. In a container running as root (like the cloud sessions) set `PLAYWRIGHT_MCP_SANDBOX=false` and `PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium` in the environment; on a normal computer no settings are needed.
