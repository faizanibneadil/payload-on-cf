# 13. Task tracker

One feature = one task. Flow (standing rule 9 in `12`): branch `task/<id>-<name>` from the latest `dev` -> build + tests -> push -> PR into `dev` -> **owner merges** -> CI deploys dev -> owner checks -> mark `done` here -> next task.

Status: `todo` -> `in progress` -> `in review` (PR open) -> `merged` (owner merged, deployed to dev) -> `done` (owner verified on dev).
When a task changes status, update its row in the same branch/PR.

## Iteration A: clean-up and foundation
| Id | Task | Tests | Status | PR / notes |
|---|---|---|---|---|
| A1 | Knowledge base: new direction, learnings, remove canvas/presentation/layout docs, this tracker | docs only | done | PR #22 |
| A2 | Remove the live-check (script, workflow, spec, `[live-check]` hook in `deploy.yml`) | full suite | done | PR #23 |
| A3 | Remove the infinite canvas (code, files, tests); migration deletes old canvas boards; `data.doc` + `validateDocument`; empty Lexical editor (paragraphs) for the owner; server read view for visitors; Save/Share keep working | unit: `tests/int/document.int.spec.ts`; e2e: `tests/e2e/editor/basics.spec.mjs`, save-share | in review | branch `task/a3-board-document` |

## Iteration B: text types (each with its markdown shortcut)
| Id | Task | Status |
|---|---|---|
| B1 | Slash menu shell (`/`, filter, keyboard, categories) | todo |
| B2 | Headings H1-H6 | todo |
| B3 | Quote | todo |
| B4 | Bulleted list | todo |
| B5 | Numbered list | todo |
| B6 | Check list | todo |
| B7 | Horizontal rule | todo |
| B8 | Indent | todo |
| B9 | Alignment | todo |

## Iteration C: inline toolbar
| Id | Task | Status |
|---|---|---|
| C1 | Toolbar shell (shows on selection, positioned at it) | todo |
| C2 | Bold | todo |
| C3 | Italic | todo |
| C4 | Underline | todo |
| C5 | Strikethrough | todo |
| C6 | Superscript | todo |
| C7 | Subscript | todo |
| C8 | Inline code | todo |
| C9 | Text type dropdown (paragraph, headings, lists, check list, quote) | todo |
| C10 | Alignment and indent in the toolbar | todo |
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
