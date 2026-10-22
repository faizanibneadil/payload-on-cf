# 12. Owner rules and learnings (read before every task)

Every correction or instruction from the owner is recorded here, with what it means for later work, so the same mistake is not made twice and earlier features are not broken. Add a line every time the owner corrects or asks for a change. When this file disagrees with older notes, this file wins (newest owner word).

## Standing rules
1. **No surprises.** Build only what the owner asked for. When something is not specified (behaviour, design, naming, limits, workflow, tools, libraries), do not decide it alone: give the owner options (with a recommendation and trade-offs) and wait for the answer. Small internal details that the owner never sees (variable names, file split) are fine to decide.
2. **Keep learnings.** Each owner request is a learning: write it down here and follow it in all later work.
3. **Nothing breaks.** Before every push, run all browser suites (not only the one for the new feature) on the production Worker build. A change to one feature must keep the earlier owner requests working (see "Learnings" below).
4. **Test and report.** Every task ends with real-browser testing, screenshots and a pass/fail report (`09-checklist.md`).
5. **Fast development.** Nothing may slow down the push-to-deploy cycle or eat into free limits without the owner's OK (October 2026: the per-push live-check was removed for this reason).
6. Stay on the Cloudflare Workers **free plan** (10 ms CPU per request). GitHub Actions only.
7. Code comments in Roman Urdu; commits and PR text in English. Work on `dev`; never touch `main` or production D1/R2.
8. Reply to the owner in Roman Urdu.

## Learnings (owner requests, newest last)
| Date | Owner said | What it means from now on |
|---|---|---|
| Oct 2026 | Pivot: Boards for instructors, remove the code editor completely | No Monaco, Vivari, preview, templates, Lexical, Tiptap, "/" menu unless the owner brings them back |
| Oct 2026 | Logout/refresh broke on dev, fix before moving on | Bugs found on dev come before new features |
| Oct 2026 | Free plan only | Page reads never load Payload (`09-checklist.md`, "Free plan CPU") |
| Oct 2026 | Text blocks must resize horizontally **and** vertically | Height is a minimum height; never shorter than the text |
| Oct 2026 | No resize handle squares; resize by dragging the border lines; selected = same thin border as hover | No visible handles on blocks; selection style = hover style (`ring-1 ring-primary/30`) |
| Oct 2026 | On resize the text must resize too | Corner drag scales block and text together (`scale`); see open choice A below |
| Oct 2026 | Live-check made every push slow (10-20 min with failures/re-runs) | CI must stay fast; heavy checks are opt-in, local testing is the main gate |
| Oct 2026 | No surprises; keep learnings | This file; options before any unasked decision |
| Oct 2026 | Emoji library and typography later, decided together | Do not add emoji or font changes on my own |
| Oct 2026 | Keep the browser test files in the repo if it makes the work easier | Suites live in `tests/e2e/` (Playwright Test); `pnpm test:e2e` runs all of them before every push |
| Oct 2026 | Update cors/csrf for dev (dev URL) and main (lecture.devslix.com); maybe `*.devslix.com` | Origins per environment in `wrangler.jsonc` `vars` (`SERVER_URL`, `ALLOWED_ORIGINS`); wildcard is an open choice (F) |
| Oct 2026 | Finish Iteration 3 before moving on | No new iteration until the owner signs off Iteration 3 |
| Oct 2026 | "Tum ne sahi kia he, ab agy chalte hen" (after the Iteration 3 / origins report) | Iteration 3 is verified; choices A, B, D accepted as built (still changeable on request) |

| Oct 2026 | Own canvas engine, no Excalidraw/tldraw. Study how they work and build only what we need, growing it with our needs; the canvas must feel smooth | Never add the tldraw or Excalidraw packages. Learn from their public docs/architecture, write our own code (tldraw's license does not allow copying its code) |
| Oct 2026 | Product goal: instructors design proper, interactive lectures (not a plain whiteboard). Later: AI that helps design lectures, only after the product is ready and has feedback | Do not build AI features now; keep the scene model clean and documented so AI can produce it later |
| Oct 2026 | Lexical is wanted after all (code blocks, React UI components, inline toolbar, tables, slash menu, to-do lists; same family as Payload) | Earlier "no Lexical" is replaced. Scope and storage decided in `13-iteration-4-plan.md` |
| Oct 2026 | Images: upload to R2, paste from anywhere, an image removed from a board must be deleted from R2 (free limits) | No orphan files in R2; deletion rules decided in `13-iteration-4-plan.md` |
| Oct 2026 | Presentation mode later, after deciding how slides pick blocks | Backlog item only (`11-iterations.md`) |
| Oct 2026 | Flow per iteration: finalise the shape together -> agent plans and splits into small tasks -> implements -> pushes to dev -> owner checks and verifies -> next | Never start implementing an iteration before its shape is final |
| Oct 2026 | Iteration 4 answers: tools OK, no Duplicate button, style panel only for a stylable selection, alignment guides, pen yes, arrows and frames later, images shrunk for instructors (originals on a future paid plan), 10 images per board (admin unlimited), images served by this project only (no extra domain), rebuild text blocks on Lexical with its markdown converters, dynamic block width, shadcn-style code block with line numbers and copy, Playwright Test + Playwright MCP | Details and remaining open points in `13-iteration-4-plan.md` |
| Oct 2026 | Do not bring in outside services or domains the owner does not have | Everything runs inside this project (Worker, D1, R2) |
| Oct 2026 | Remove images from the canvas plan completely; keep R2 config; images only via the Payload admin. Type-anywhere and Lexical storage accepted. Callout demo yes. Links with label/target/rel and a hover/focus popover (Edit/Remove) | `13-iteration-4-plan.md` |
| Oct 2026 | Keep Payload's `media` collection and R2 configuration; do not touch them. Only the canvas has no image features | Never change `media` / R2 setup unless asked |

## Choices made without the owner (need confirmation)
These were decided by the agent before rule 1 existed. Each one stays as it is until the owner chooses, and the owner can change any of them.
- **A. (accepted) Edge vs corner on resize:** edges change only the box (text keeps its size and wraps again), corners scale block and text. Other options: every drag scales the text; or a separate "text size" control.
- **B. (accepted) Text size range:** 0.25x-8x of the normal size (15px).
- **C. Live-check trigger:** opt-in with `[live-check]` in a dev commit message, or by hand from the Actions tab (button appears once the file is on `main`). Other options: run it only on `main` pushes, a nightly schedule, or never in CI (local only).
- **D. (accepted) Grab area for border resize:** about 8 screen px on edges, 14 px on corners.
- **F. `*.devslix.com`:** Payload only matches exact origins (no wildcard). Options: list each domain in `ALLOWED_ORIGINS` (current, simple, safe); a small custom check that accepts any `https://<name>.devslix.com` (touches Payload internals, must be re-checked on Payload upgrades); or one variable per environment that the owner edits in the Cloudflare dashboard. Also open: should the production workers.dev URL be allowed too (today only lecture.devslix.com, same as `main` had)?
- **E. Boards per day:** default stays 10 (owner once wrote 14 and once "1 board per day"). Editable by the admin in the `settings` Global.

## Regression protection
Browser tests run on the Playwright Test runner (`playwright.config.ts`, specs in `tests/e2e/`):
- `auth-boards.spec.mjs` (iteration 1), `save-share.spec.mjs` (iteration 2), `canvas.spec.mjs` (iteration 3), `live-check.spec.mjs` (runs `scripts/live-check.mjs` locally).
- `pnpm test:e2e` builds the production Worker if needed (`BUILD=1` forces it), gives each spec file a fresh local database (`tests/e2e/server.sh`, only `.wrangler/state`, never dev or production) and runs everything with one worker.
- Every check is listed in the HTML report (`pnpm test:e2e:report`, annotations pass/FAIL). On a failure the report has the screenshot, a video of every browser window (`tests/e2e/contexts.mjs`) and a trace (each step, network, console). Passing tests keep no videos.
- Run it before every push; when an owner request changes behaviour, update the matching checks in the same commit.
- Playwright MCP (`.mcp.json`, `@playwright/mcp@0.0.83`) lets the agent drive a browser while debugging. In a container running as root (like the cloud sessions) set `PLAYWRIGHT_MCP_SANDBOX=false` and `PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium` in the environment; on a normal computer no settings are needed. The MCP server is loaded when a session starts.
