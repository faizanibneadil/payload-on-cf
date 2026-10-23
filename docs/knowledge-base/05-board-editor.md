# 05. Board editor (one Lexical document per board)

> Status: **target design** (owner decision, October 2026). Built step by step through the tasks in `13-task-tracker.md`; each section says which task builds it. Until task A3 is merged the code on `dev` still has the old infinite canvas.

## Goal
"A lecture can contain drawings, but a drawing is not a lecture." An instructor writes a lecture as one rich document: text, headings, lists, tables, links, code, and later drawings (a canvas) as blocks inside the text. It must be quick to write and pleasant to read.

## What a board is
- A board is **one Lexical editor** that fills the page under the header and scrolls normally. There is no infinite canvas, no layout option and no presentation mode.
- The owner (and admin) edit it. Everyone else sees it read-only; they can click links.
- Lexical (the same family as Payload's rich text). Payload's `@payloadcms/richtext-lexical` is the **model for how features work** (node shapes, commands, markdown shortcuts, slash menu); we do **not** use its UI or its admin components. Study its source in the official repo (`packages/richtext-lexical/src/features/...`) before building a feature.

## Storage (task A3)
- `boards.data = { doc: SerializedEditorState }`: Lexical's JSON (`{ root: { type: 'root', children: [...] } }`). Markdown is no longer the storage format, because underline, superscript/subscript, alignment, indent, colours, tables and blocks cannot be stored in markdown.
- Blocks use Payload's node shape so the JSON stays familiar: `{ type: 'block', fields: { id, blockType, ...settings } }` and `{ type: 'inlineBlock', fields: { id, blockType, ...settings } }`.
- One `boards` row holds the whole document (limit about 1.8 MB from the `settings` Global; D1 row limit 2 MB). Lexical JSON is bigger than markdown, but 1.8 MB is still a very long lecture.
- Server validation (`validateDocument`, in the Boards `beforeValidate` hook): only known node types, a depth limit, text and size limits, block fields checked against each block's settings. A plain JSON walk; Payload's `richText` field is not used (its validation is heavy for the free plan CPU).
- Old infinite-canvas boards are **not supported**: the A3 migration deletes those rows.

## Rendering
- Owner: the Lexical editor (client, lazy-loaded chunk).
- Visitors: a read view rendered on the server from the JSON (JSON -> React, no Lexical JavaScript in the browser). Its CPU time on long documents is measured (free plan, 10 ms).
- One set of theme classes is shared by the editor and the read view, so both look the same.

## Text features (iteration B, each one task with its markdown shortcut and tests)
| Feature | Markdown shortcut (like Payload) |
|---|---|
| Paragraph | - |
| Headings H1-H6 | `# ` ... `###### ` |
| Quote | `> ` |
| Bulleted list | `- `, `* `, `+ ` |
| Numbered list | `1. ` |
| Check list | `- [ ] `, `- [x] ` |
| Horizontal rule | `---` |
| Indent | Tab / Shift+Tab |
| Alignment | - (left, center, right, justify) |

## Inline toolbar (iteration C)
- **No fixed toolbar.** A floating toolbar appears only on a text selection, positioned at the selection (portal in `body`).
- Items: text type dropdown (paragraph, headings, lists, check list, quote), bold, italic, underline, strikethrough, superscript, subscript, inline code, alignment, indent / outdent, text state (colours), link.
- Text state: text and background colours from Payload's `defaultColors` (look good in light and dark). Stored as Lexical node state, not as inline CSS.
- Format shortcuts like Payload/Lexical: `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``; Ctrl/Cmd+B, I, U.

## Links (iteration D)
- Fields: label (text shown), URL, open in new tab (`target`), `rel` (e.g. `noopener noreferrer`, `nofollow`).
- While editing, when the cursor is on a link a small popover shows the label (or the URL), with **Edit** and **Remove**. Edit opens the fields in the same place.
- Visitors can click links (they open with the link's target); only the owner changes them.

## Tables (iteration E)
Payload's table feature as the model: insert a table, add/remove rows and columns, header row/column, cell merge if Payload offers it.

## Slash menu (iteration B, extended in F)
`/` opens a menu at the cursor, filtered while typing, with Payload's categories: basic items (text types, lists, quote, horizontal rule, table), **Blocks**, **Inline blocks**.

## Blocks and inline blocks (iteration F, canvas in G)
- A block is a Lexical decorator node on its own line; an inline block sits inside a line of text. Both are part of the same document JSON (shape above).
- Inserted from the slash menu (categories "Blocks" and "Inline blocks"). No drag handle.
- Settings: **no drawer**. Selecting a block (or clicking its settings button) opens a small popup next to it, like the inline toolbar, in our own UI (shadcn on Base UI).
- Blocks: **Code block** (shadcn `code-block` style: line numbers, copy button, highlighting with Shiki's JavaScript engine loaded per language; settings to confirm before F4), **Canvas**.
- Inline blocks: **Canvas** (a button in the text).
- Canvas (iteration G, built from scratch, shape decided with the owner then): the Canvas block shows a preview of the whole drawing; the Canvas inline block shows a button. A click on either opens the canvas on its own route.

## Later (decide with the owner)
- Emoji library; typography (fonts, sizes).
- Canvas tools and its route.
- More UI components.
