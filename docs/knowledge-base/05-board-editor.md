# 05. Board editor (one Lexical document per board)

> **25 Oct 2026: being replaced.** The owner decided to build the board on Payload's own rich text (`richText` field, Payload features, blocks, Views). Everything below describes our own Lexical build (tasks A3-C4) and stays as history and as the record of the owner's look/behaviour decisions until the new plan in `15-direction-payload-richtext.md` replaces it.

> Status: **target design** (owner decision, October 2026), built step by step through the tasks in `13-task-tracker.md`; each section says which task builds it. Built so far: storage, validation, editor with paragraphs, read view (task A3).

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

## As built (task A3)
- Page: the document sits in a centred column (max width 3xl, padding 16-32 px) under the header and scrolls with the page.
- Owner: the server read view shows first, then the editor chunk replaces it (same classes, nothing moves). Placeholder "Start writing your lecture..." on an empty board; the editor is at least half a screen tall, so a click below the text puts the cursor in it.
- Only paragraphs for now: Enter = new paragraph, Shift+Enter = line break. Formatting and alignment commands are blocked and pasted rich text arrives without them, until their own tasks enable them (indent since B8).
- Typed text reaches the board 300 ms after typing stops, so "Unsaved changes" shows while still typing; Save and Ctrl/Cmd+S (also inside the editor) include the newest text. Opening a board is never an unsaved change (the editor's normalized document becomes the saved baseline).
- Undo/redo: Lexical history (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z).
- Visitor of a shared board with no text sees "This board is empty."
- Migration `20261023_220000_delete_canvas_boards` deletes every board whose data is not a document (old canvas, empty or broken).

## Text features (iteration B, each one task with its markdown shortcut and tests)
| Feature | Markdown shortcut (like Payload) |
|---|---|
| Paragraph | - |
| Headings H1-H6 | `# ` ... `###### ` |
| Quote | `> ` |
| Bulleted list | `- `, `* `, `+ ` |
| Numbered list | `1. ` |
| Check list | `[ ] `, `[x] ` (Payload's; `- [ ] ` while typing becomes a bullet at `- ` first, in Payload too) |
| Horizontal rule | `--- ` (three dashes and a space, Payload's) |
| Indent | Tab / Shift+Tab |
| Alignment | - (left, center, right, justify; from the toolbar, task C10) |

## Headings (as built, task B2)
- `features/heading.ts`: Lexical `HeadingNode`, markdown `HEADING` (`# ` to `###### ` at the start of a line), slash items "Heading 1"-"Heading 6" (keywords `heading`, `h1`...), lucide icons.
- Behaviour is Lexical/Payload's: Enter at the end of a heading starts a paragraph, Enter in the middle splits it into two headings; Backspace at the start of a heading with text keeps it (it does not turn into text, unlike the old canvas), an empty heading on the first line becomes a paragraph, an empty heading under another line is removed. Pasted `<h1>`-`<h6>` stay headings. To turn a heading back into text: slash menu > Paragraph.
- Look (shadcn typography, changeable when typography is decided): H1 4xl extrabold, H2 3xl semibold (no line under it, owner), H3 2xl, H4 xl, H5 lg, H6 base, all bold; space above except on the first line.
- Server: `heading` with `tag` h1-h6 only.

## Quote (as built, task B3)
- `features/quote.ts`: Lexical `QuoteNode`, markdown `QUOTE` (`> ` at the start of a line), slash item "Blockquote" (keywords `quote`, `blockquote`, Payload's label), lucide `TextQuote` icon.
- Look (owner): a thin line on the left only, indented, italic. Shift+Enter = new line inside the quote; Enter at the end = paragraph after it; Backspace at the start turns the quote back into a paragraph (text kept). Pasted `<blockquote>` stays a quote.
- Server: `quote` node with children.

## Unordered list (as built, task B4)
- `features/unordered-list.ts`: Lexical `ListNode` + `ListItemNode`, markdown `UNORDERED_LIST` (`- `, `* `, `+ `), Lexical `ListPlugin` (features can now bring plugins), slash item "Unordered List" in the **Lists** group (Payload's label; keywords `unordered list`, `ul`, `bullet`), lucide `List` icon.
- Enter = next item, Enter on an empty item = end of the list, Backspace at the start of the first item = back to a paragraph. Pasted `<ul>` stays a list. Numbered lists exist since B5, check lists since B6.
- Look: standard round bullets (disc), indented; nested lists (Tab, or paste) have no bullet on the wrapping item, like Lexical. Every bullet level uses round bullets.
- Server: `list` (listType `bullet` or `number`; children only `listitem`), `listitem` (`checked` boolean, `value` integer, if present).

## Ordered list (as built, task B5)
- `features/ordered-list.ts`: same Lexical `ListNode` + `ListItemNode` and `ListPlugin` as B4 (registered once), markdown `ORDERED_LIST` (`<number>. ` at the start of a line), slash item "Ordered List" in the **Lists** group after "Unordered List" (Payload's label, owner; keywords `ordered list`, `ol`, `numbered`), lucide `ListOrdered` icon.
- Start number (owner): the typed number, like Lexical/Payload: `3. ` starts the list at 3 (next item 4); a pasted `<ol start="5">` keeps 5. Allowed 1-9999: the editor moves anything outside (e.g. `0. `) into that range (`ListStartPlugin`), the server rejects it (`Invalid list start`).
- Enter / Backspace / undo like the bullet list. A numbered list right after a bullet list stays its own list. Slash menu > Ordered List inside a bullet list turns the whole list into a numbered list (and Unordered List back), Lexical's behaviour. Pasted `<ol>` stays numbered.
- Look (owner: like Payload): numbers outside the text, indented like bullets; every nesting level has its own style: `1.` -> `A.` -> `a.` -> `I.` -> `i.`, then `1.` again (theme `list.olDepth`, the level counts all list levels like Lexical). An item that only holds a nested list takes no number (Lexical); the read view gives each `<li>` the same `value` and each `<ol>` the same `start`, so visitors see the same numbers.
- Server: `list.start` integer 1-9999 if present.

## List nesting with Tab (as built, B5 fix)
- Owner (B5 check on dev): Tab must make a nested list. `features/list-tab.ts` (`ListTabPlugin`, part of both list features): in a list item Tab = one level in, Shift+Tab = one level out (Lexical's list item indent = nesting, like Payload). Works with several items selected, in numbered and bullet lists; the cursor stays in the editor. Enter on an empty nested item moves it one level out (Lexical).
- Limit: 15 levels (`MAX_LIST_INDENT` in `src/lib/document.ts`, derived from the server's depth limit `MAX_DEPTH` 32), so a nested list always saves; further Tabs do nothing.
- Outside lists Tab indents the line since task B8 (below). The nesting limit is applied by B8's Tab plugin (`maxIndent`), the same limit for list items and lines.

## Check list (as built, task B6)
- `features/check-list.ts`: same list nodes, `ListPlugin` and Tab nesting, plus Lexical's `CheckListPlugin`; markdown `CHECK_LIST` (`[ ] ` open, `[x] ` / `[X] ` ticked, at the start of a line), slash item "Check List" in the **Lists** group after "Ordered List" (Payload's label, owner; keywords `check list`, `check`, `checklist`, `cl`), lucide `ListChecks` icon.
- Owner ticks an item by clicking its box (a click on the text does not tick) or from the keyboard: at the start of an item Left focuses the box, Space ticks, Escape goes back to the text. A tick is an ordinary unsaved change; Save keeps it. Enter makes a new open item, Backspace at the start of the first item turns it back into a paragraph, Tab nests (the wrapping item has no box). Slash menu > Check List inside another list turns the whole list into a check list (Lexical). Pasted check lists (Lexical's `__lexicallisttype="check"`) keep their ticks.
- Look (owner: like Payload): a 16 px box with rounded corners at the left of the item; open = thin border in the text colour; ticked = box filled with the primary colour and a tick mark in the primary foreground colour, text struck through. No bullet; the text lines up with bullet and numbered list text. Theme classes `board-checklist`, `board-check-checked`, `board-check-unchecked`, `board-list-wrapper`; the box (`::before`) and tick (`::after`) are in `src/app/globals.css`, because Lexical counts a click as a tick only between the item's left edge and the width of its `::before`.
- Visitors (owner): look only. The read view renders the same classes with `role="checkbox"`, `aria-checked` and `aria-readonly`; there is no JavaScript, so a click changes nothing.
- Server: listType `check`; `checked` must be true/false if present.

## Horizontal rule (as built, task B7)
- `features/horizontal-rule.ts`: Lexical's `HorizontalRuleNode` (JSON type `horizontalrule`, same as Payload) and `HorizontalRulePlugin`; markdown `--- ` at the start of a line (Payload's pattern); slash item "Horizontal Rule" in the **Basic** group after Blockquote (Payload's label and group, owner; keywords `hr`, `horizontal rule`, `line`, `separator`), lucide `Minus` icon.
- `--- ` replaces the line; when it was the last line an empty line stays below it, and typing goes on under the rule (Lexical playground's way; Payload's transformer leaves no line below). The slash item puts the rule under the current line.
- Click on the rule selects it (ring); Backspace or Delete removes it; undo brings it back. Backspace at the start of the line below removes the rule in one press (text kept, Lexical). Pasted `<hr>` stays a rule.
- Look (owner: like Payload): a 2 px light grey line (`--foreground` at 20%, visible in light and dark), 12 px space above and below, no border; selected = 3 px ring in `--ring`. Classes `board-hr` / `board-hr-selected`, CSS in `src/app/globals.css`.
- Found with `/hr`, `/horizontal`, `/rule`, `/line`, `/separator` (word-start search, B7 fix); `/ul` finds only Unordered List.
- Server: `horizontalrule` with no children. A board with only a rule counts as content.

## Indent (as built, task B8)
- `features/indent.ts` (Payload's IndentFeature as the model; no slash item, no markdown shortcut, like Payload): Lexical's `TabIndentationPlugin` plus our `IndentPlugin` and `EscapeTabPlugin`. Lines that indent (owner): paragraph, heading, quote. List items keep nesting with Tab (`list-tab.ts`, B5 fix).
- Tab (owner: Payload default): at the start of a line, or with several lines selected, Tab moves the whole line in one level; Tab in the middle or at the end of text inserts a tab character. Shift+Tab always moves the line one level out, wherever the cursor is (owner said "Shift+Tab = out"; Lexical alone would insert a tab character there). In a list Tab / Shift+Tab always nest / un-nest, also in the middle of an item (no tab characters in lists).
- One level = 24 px (owner: as much as list nesting), CSS variable `--lexical-indent-base-value` on `.board-document` (`globals.css`); Lexical writes `padding-inline-start: calc(n * var(...))` on the line. A quote moves as a whole (margin, its left line too), so it keeps its own inner space (`IndentPlugin` mutation listener; read view the same). Helper `indentSize()` in `theme.ts`, class `board-indent`.
- Limit (owner): 15 levels like list nesting, i.e. indent 0-14 (`MAX_INDENT` = `MAX_LIST_INDENT` in `src/lib/document.ts`); further Tabs do nothing. Pasted or old lines deeper than that are set to 14 (node transform).
- Keys (Lexical/Payload): Backspace at the start of an indented line moves it one level out first; Enter at the end of an indented line starts the next line **without** indent (Lexical's `insertNewAfter`, Payload the same); undo/redo per step. Pasted `padding-inline-start` keeps an indent (Lexical's 40 px steps), at most the limit.
- Tab character width: 4 characters (`tab-size: 4` in `documentClass`, editor and read view). A tab jumps to the next 4-character stop, so after a 3-letter word it is only 1 character wide (normal tab stops).
- Leaving the editor from the keyboard (owner: Escape then Tab, Payload's way): Escape takes the focus out of the editor (Lexical); the next Tab / Shift+Tab goes to the next / previous control. For that one key the editor gets `tabindex="-1"` (Shift+Tab would otherwise land on the editor again, because the caret is inside it). Escape in the slash menu only closes the menu.
- Read view: the same padding (quote: margin) as an inline style, so visitors see the same positions.
- Server: `indent` on paragraph, heading and quote must be an integer 0-14 if present (`Invalid indent`).

## Inline toolbar (iteration C)
- **No fixed toolbar.** A floating toolbar appears only on a text selection, positioned at the selection (portal in `body`).
- Items: text type dropdown (paragraph, headings, lists, check list, quote), bold, italic, underline, strikethrough, superscript, subscript, inline code, alignment, indent / outdent, text state (colours), link.
- Text state: text and background colours from Payload's `defaultColors` (look good in light and dark). Stored as Lexical node state, not as inline CSS.
- Format shortcuts like Payload/Lexical: `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``; Ctrl/Cmd+B, I, U.

### Toolbar shell (as built, task C1)
- `src/components/editor/inline-toolbar/`: `toolbar-items.ts` (groups, item type, `buildToolbarGroups`, `toolbarPosition`; no Lexical import) and `inline-toolbar-plugin.tsx` (`InlineToolbarPlugin`, in `board-editor.tsx`, owner only).
- Each feature adds buttons with `toolbar: { group, items }` (`features/types.ts`); `features/index.ts` builds `toolbarGroups`. Groups in Payload's order (owner): text type | format | link | alignment | indent | colour, a thin vertical line between groups, empty groups hidden. **No buttons -> no toolbar** (C1 has none; Bold comes in C2, owner checks C1 + C2 together).
- When (owner: like Payload): shows for a text selection (not only spaces) after the mouse is released or with Shift+Arrow; hides when the selection collapses (typing, click), on Escape (Lexical blurs the editor), when the editor loses focus, and while the mouse is pressed for a new selection. Never for visitors (they have no editor).
- Where (owner): above the selection, centred on it; below when there is no room above (under the header, `h-12`); kept 8 px inside the screen left and right; follows scrolling (fixed position, recalculated on scroll/resize).
- Look (owner: shadcn): small box with rounded corners, thin border, light shadow, theme background (`bg-popover`, light and dark); 32 px icon buttons (lucide, muted colour; hover/active = `bg-accent`), `aria-pressed` for an applied format; tooltip with the name and shortcut (shadcn Tooltip on Base UI). A click on a button keeps the editor's focus and selection (mouse down is prevented on the toolbar).
- `role="toolbar"` (`aria-label="Text formatting"`), each group `role="group"`, test ids `inline-toolbar`, `toolbar-<key>`.
- The first line of the board has no room above (header), so its toolbar shows below the selection.

### Bold (as built, task C2)
- `features/bold.ts` (Payload's BoldFeature): toolbar button "Bold" first in the format group (lucide `Bold`, tooltip `Ctrl+B`, `⌘B` on a Mac), Ctrl/Cmd+B (Lexical), markdown `**text**` and `__text__` while typing (Payload; `***` bold-italic comes with italic, C3). With no selection Ctrl/Cmd+B makes the next typed text bold.
- Text formats are switched on per feature (`textFormats` in the feature file). `NotYetPlugin` lets only those through (commands, paste, shortcuts) and strips the other bits from text and from an empty line's typing format; the server's `ALLOWED_TEXT_FORMAT` (`src/lib/document.ts`, `TEXT_FORMAT_BITS`) must match (unit test) and rejects other bits (`Invalid text format`).
- Pasted `<b>`, `<strong>` and `font-weight: 700` (Google Docs) stay bold.
- Look: `<strong>` with `font-weight: bolder` (theme `text.bold`): 700 in normal text like Payload, and still heavier than a heading inside headings (Payload's plain `bold` would make bold text lighter than an H1). The read view renders the same `<strong>`. Owner: OK (C1 + C2 check).

### Italic (as built, task C3)
- `features/italic.ts` (Payload's ItalicFeature): toolbar button "Italic" after Bold (lucide `Italic`, tooltip `Ctrl+I` / `⌘I`), Ctrl/Cmd+I (Lexical), markdown `*text*` and `_text_` (not inside a word: `snake_case` stays), and with bold `***text***` / `___text___` (Payload adds these only when italic exists).
- Markdown order: text-format shortcuts are sorted longest mark first (`***` before `**` before `*`, `features/index.ts`), other shortcuts keep their order.
- Look: `<em>` with class `board-italic` (`font-style: italic`); bold + italic = one `<strong>` with both classes (Lexical). Inside a quote (already italic) an italic word shows **upright** (owner, C3), CSS in `globals.css`. Read view the same tags and classes.
- Pasted `<i>`, `<em>` and `font-style: italic` stay italic. Server: format bit 2 allowed (`TEXT_FORMAT_BITS.italic`).

### Underline (as built, task C4)
- `features/underline.ts` (Payload's UnderlineFeature): toolbar button "Underline" after Italic (lucide `Underline`, tooltip `Ctrl+U` / `⌘U`), Ctrl/Cmd+U (Lexical). No markdown shortcut (markdown has no underline; Payload has none either).
- Look: a plain underline (`text-decoration: underline`, theme `text.underline`), like Payload; it combines with bold and italic on the same text (Lexical keeps one tag: `<strong>`, `<em>` or `<span>`, with every format's class; the read view does the same).
- Pasted `<u>` and `text-decoration: underline` (Google Docs) stay underlined. Server: format bit 8 allowed.
- Tests check the toolbar order as "this button right after the previous one", so later buttons do not break earlier specs.

## Links (iteration D)
- Fields: label (text shown), URL, open in new tab (`target`), `rel` (e.g. `noopener noreferrer`, `nofollow`).
- While editing, when the cursor is on a link a small popover shows the label (or the URL), with **Edit** and **Remove**. Edit opens the fields in the same place.
- Visitors can click links (they open with the link's target); only the owner changes them.

## Tables (iteration E)
Payload's table feature as the model: insert a table, add/remove rows and columns, header row/column, cell merge if Payload offers it.

## Slash menu (iteration B, extended in F)
As built (task B1): `src/components/editor/slash-menu/`. Opens on `/` at the start of a line, after a space or after `(` (Payload's trigger); the text after `/` (no spaces, max 75 characters) filters items by label and keywords, ignoring case, spaces, `-` and `_`, and matches only from the start of a label, a keyword or one of their words (owner, B7 fix: `/hr` or `/rule` find Horizontal Rule, `/ul` does not; Payload matches anywhere); no match or a space closes it. Arrow keys / hover highlight, Enter / Tab / click pick (the `/query` text is removed, one undo step), Escape closes and keeps the text. Menu sits under the `/`, groups have a small title, items an icon. Each feature adds its items to a group from its own file in `src/components/editor/features/` (listed in `features/index.ts`); empty groups are hidden. Group keys like Payload: `basic`, `lists`, `blocks`, `inlineBlocks`. Today: Basic > Paragraph, Heading 1-6, Blockquote, Horizontal Rule; Lists > Unordered List, Ordered List, Check List. The menu is at most 320 px tall and scrolls (the highlighted item scrolls into view).
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
