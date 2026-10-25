# 13. Task tracker

One feature = one task. Flow (standing rule 9 in `12`): branch `task/<id>-<name>` from the latest `dev` -> build + tests -> push -> PR into `dev` -> **owner merges** -> CI deploys dev -> owner checks -> mark `done` here -> next task.

Status: `todo` -> `in progress` -> `in review` (PR open) -> `merged` (owner merged, deployed to dev) -> `done` (owner verified on dev).
When a task changes status, update its row in the same branch/PR.

## Iteration A: clean-up and foundation
| Id | Task | Tests | Status | PR / notes |
|---|---|---|---|---|
| A1 | Knowledge base: new direction, learnings, remove canvas/presentation/layout docs, this tracker | docs only | done | PR #22 |
| A2 | Remove the live-check (script, workflow, spec, `[live-check]` hook in `deploy.yml`) | full suite | done | PR #23 |
| A3 | Remove the infinite canvas (code, files, tests); migration deletes old canvas boards; `data.doc` + `validateDocument`; empty Lexical editor (paragraphs) for the owner; server read view for visitors; Save/Share keep working | unit: `tests/int/document.int.spec.ts`; e2e: `tests/e2e/editor/basics.spec.mjs`, save-share | done | PR #24 |

## Iteration B: text types (each with its markdown shortcut)
| Id | Task | Status |
|---|---|---|
| B1 | Slash menu shell (`/`, filter, keyboard, categories) | done (PR #25; tests `tests/int/slash-menu.int.spec.ts`, `tests/e2e/editor/slash-menu.spec.mjs`) |
| B2 | Headings H1-H6 | done (PR #26, fix PR #27: no line under H2; tests `tests/int/editor-features.int.spec.ts`, `tests/e2e/editor/headings.spec.mjs`) |
| B3 | Quote | done (PR #28; tests `tests/int/editor-features.int.spec.ts`, `tests/e2e/editor/quote.spec.mjs`) |
| B4 | Bulleted list ("Unordered List") | done (PR #29; tests `tests/int/editor-features.int.spec.ts`, `tests/int/document.int.spec.ts`, `tests/e2e/editor/unordered-list.spec.mjs`) |
| B5 | Numbered list ("Ordered List") | done (PR #31, Tab nesting fix PR #32; owner verified on dev; tests `tests/int/editor-features.int.spec.ts`, `tests/int/document.int.spec.ts`, `tests/e2e/editor/ordered-list.spec.mjs`, `tests/e2e/editor/list-tab.spec.mjs`) |
| B6 | Check list | done (PR #33; owner verified on dev; tests `tests/int/editor-features.int.spec.ts`, `tests/int/document.int.spec.ts`, `tests/e2e/editor/check-list.spec.mjs`) |
| B7 | Horizontal rule | done (PR #34, slash search fix PR #35: matches from the start of words; owner verified on dev; tests `tests/int/editor-features.int.spec.ts`, `tests/int/document.int.spec.ts`, `tests/e2e/editor/horizontal-rule.spec.mjs`) |
| B8 | Indent (paragraphs, headings, quotes; list items already nest with Tab since the B5 fix) | done (PR #39; owner verified on dev; tests `tests/int/document.int.spec.ts`, `tests/int/editor-features.int.spec.ts`, `tests/e2e/editor/indent.spec.mjs`, `tests/e2e/editor/list-tab.spec.mjs` updated) |
| B9 | Alignment | moved to iteration C (owner: alignment belongs to the toolbar; build the toolbar first, then its features). Built as part of C10; owner decisions already taken (`12`) |

## Iteration C: inline toolbar
| Id | Task | Status |
|---|---|---|
| C1 | Toolbar shell (shows on selection, positioned at it) | done (PR #40; owner verified on dev together with C2; tests `tests/int/inline-toolbar.int.spec.ts`, `tests/e2e/editor/inline-toolbar.spec.mjs`) |
| C2 | Bold | done (PR #41; owner verified on dev; tests `tests/int/editor-features.int.spec.ts`, `tests/int/document.int.spec.ts`, `tests/int/inline-toolbar.int.spec.ts`, `tests/e2e/editor/bold.spec.mjs`, `tests/e2e/editor/inline-toolbar.spec.mjs`) |
| C3 | Italic | in review (branch `task/c3-italic`; tests `tests/int/editor-features.int.spec.ts`, `tests/int/document.int.spec.ts`, `tests/int/inline-toolbar.int.spec.ts`, `tests/e2e/editor/italic.spec.mjs`; `basics`/`bold` specs updated) |
| C4 | Underline | todo |
| C5 | Strikethrough | todo |
| C6 | Superscript | todo |
| C7 | Subscript | todo |
| C8 | Inline code | todo |
| C9 | Text type dropdown (paragraph, headings, lists, check list, quote) | todo |
| C10 | Alignment (was B9: left, center, right, justify on paragraph/heading/quote; Enter keeps it) and indent in the toolbar | todo |
| C11 | Text state colours (`defaultColors`) | todo |

## Iteration D: links
| Id | Task | Status |
|---|---|---|
| D1 | Link node + toolbar button (label, URL, new tab, rel) | todo |
| D2 | Hover/focus popover with Edit / Remove | todo |
| D3 | Links in the visitor read view | todo |

## Iteration E: tables
| Id | Task | Status |
|---|---|---|
| E1 | Insert table | todo |
| E2 | Add / remove rows and columns | todo |
| E3 | Header row / column | todo |
| E4 | Cell merge (if Payload offers it) | todo |

## Iteration F: blocks and inline blocks
| Id | Task | Status |
|---|---|---|
| F1 | Block and inline block nodes (Payload node shape), server validation | todo |
| F2 | Slash menu categories "Blocks" and "Inline blocks" | todo |
| F3 | Settings popup next to the selected block | todo |
| F4 | Code block (settings confirmed with the owner first) | todo |

## Iteration G: canvas (from scratch, shape decided with the owner first)
| Id | Task | Status |
|---|---|---|
| G1 | Canvas block (preview) | todo |
| G2 | Canvas inline block (button) | todo |
| G3 | Canvas route and editor | todo |

## Infrastructure
| Id | Task | Status |
|---|---|---|
| CI1 | Whole test suite in GitHub Actions before every deploy (dev and main): unit, lint, tsc, browser suite in 4 parallel shards; locally only the tests of changed modules | done (PR #36 + fix PR #37: install Playwright's `ffmpeg` for videos; first green run `5134aa6`, about 8 min merge to deploy; owner: "nice work") |
