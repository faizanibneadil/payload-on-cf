# 12. Owner rules and learnings (read before every task)

Every correction or instruction from the owner is recorded here, with what it means for later work, so the same mistake is not made twice and earlier features are not broken. Add a line every time the owner corrects or asks for a change. When this file disagrees with older notes, this file wins (newest owner word).

## Standing rules
1. **No surprises.** Build only what the owner asked for. When something is not specified (behaviour, design, naming, limits, workflow, tools, libraries), do not decide it alone: give the owner options (with a recommendation and trade-offs) and wait for the answer. Small internal details that the owner never sees (variable names, file split) are fine to decide.
2. **Keep learnings.** Each owner request is a learning: write it down here and follow it in all later work.
3. **Nothing breaks.** Before every push, run all browser suites (not only the one for the new feature) on the production Worker build, plus `pnpm test:int`, `pnpm lint` and `pnpm exec tsc --noEmit`. A change to one feature must keep the earlier owner requests working.
4. **Test and report.** Every task has its own tests (every tool and every component), and ends with real-browser testing, screenshots and a pass/fail report (`09-checklist.md`). While working, run only the tests of the task; the full suite runs once, before the push.
5. **Fast development.** Nothing may slow down the push-to-deploy cycle or eat into free limits without the owner's OK. No tests in GitHub Actions (owner, October 2026); testing is local.
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

## Open choices (need the owner's answer)
- **E. Boards per day:** default stays 10 (owner once wrote 14 and once "1 board per day"). Editable by the admin in the `settings` Global.
- **F. `*.devslix.com`:** Payload only matches exact origins (no wildcard). Options: list each domain in `ALLOWED_ORIGINS` (current, simple, safe); a small custom check that accepts any `https://<name>.devslix.com` (touches Payload internals, must be re-checked on Payload upgrades); or one variable per environment that the owner edits in the Cloudflare dashboard. Also open: should the production workers.dev URL be allowed too (today only lecture.devslix.com)?
- **Code block settings (before task F4):** recommendation = language + optional file name; copy button and line numbers always on.

## Regression protection
Browser tests run on the Playwright Test runner (`playwright.config.ts`, specs in `tests/e2e/`):
- `auth-boards.spec.mjs` (accounts, boards list), `save-share.spec.mjs` (Save, Share, limits); editor features get one spec per feature under `tests/e2e/editor/` (from task A3 on). Unit tests (document validation, converters) in `tests/int/`.
- `pnpm test:e2e` builds the production Worker if needed (`BUILD=1` forces it), gives each spec file a fresh local database (`tests/e2e/server.sh`, only `.wrangler/state`, never dev or production) and runs everything with one worker.
- Every check is listed in the HTML report (`pnpm test:e2e:report`, annotations pass/FAIL). On a failure the report has the screenshot, a video of every browser window (`tests/e2e/contexts.mjs`) and a trace (each step, network, console). Passing tests keep no videos.
- When an owner request changes behaviour, update the matching checks in the same commit.
- Playwright MCP (`.mcp.json`, `@playwright/mcp@0.0.83`) lets the agent drive a browser while debugging. In a container running as root (like the cloud sessions) set `PLAYWRIGHT_MCP_SANDBOX=false` and `PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium` in the environment; on a normal computer no settings are needed.
