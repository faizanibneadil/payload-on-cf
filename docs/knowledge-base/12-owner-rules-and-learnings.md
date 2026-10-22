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

## Choices made without the owner (need confirmation)
These were decided by the agent before rule 1 existed. Each one stays as it is until the owner chooses, and the owner can change any of them.
- **A. Edge vs corner on resize:** edges change only the box (text keeps its size and wraps again), corners scale block and text. Other options: every drag scales the text; or a separate "text size" control.
- **B. Text size range:** 0.25x-8x of the normal size (15px).
- **C. Live-check trigger:** opt-in with `[live-check]` in a dev commit message, or by hand from the Actions tab (button appears once the file is on `main`). Other options: run it only on `main` pushes, a nightly schedule, or never in CI (local only).
- **D. Grab area for border resize:** about 8 screen px on edges, 14 px on corners.
- **E. Boards per day:** default stays 10 (owner once wrote 14 and once "1 board per day"). Editable by the admin in the `settings` Global.

## Regression protection
The full browser suites (iteration 1: 49 checks, iteration 2: 51, canvas: 67) currently live only in the agent's temporary session folder and are lost when the session ends. Open question for the owner: commit them to the repo (e.g. `tests/browser/`, run locally only, not in CI) so every future session can run them.
