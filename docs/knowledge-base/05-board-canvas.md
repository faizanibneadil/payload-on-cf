# 05. Board canvas (text blocks with live markdown)

> Status: built in Iteration 3; text blocks rebuilt on Lexical in Iteration 4 step 2 (`src/components/canvas/lexical/`). The plan for the rest of Iteration 4 is in `13-iteration-4-plan.md`.

## Goal
An instructor prepares a lecture on an infinite canvas: places text blocks anywhere, types markdown that turns into formatted text while typing, and moves around the board with pan and zoom. It must feel professional and stay fast and light on memory with many blocks.

## Scene model (stored in `boards.data.canvas`)
```
{ version: 1, viewport: { x, y, zoom }, objects: [ ... ] }
object = { id, type: 'text', x, y, width, height, zIndex, markdown, scale?, autoWidth? }   // height = minimum height (max 10,000), width up to 2,000, scale = text size 0.25-8 (missing = 1), autoWidth = width follows the text
```
- `markdown` is the source of truth for a text block (a plain string). The rendered view is derived from it.
- New object types (shapes, pen, images, ...) are added later with a `version` bump and a small migration function on load.

## Rendering and performance (memory efficient)
- One world layer with a single CSS `transform: translate(x, y) scale(zoom)`; objects are absolutely positioned inside it in world coordinates. Pan and zoom only change that one transform.
- Pan and zoom run on pointer events and `requestAnimationFrame`, and the live viewport lives in refs, not React state, so the tree does not re-render while panning. The viewport is written back to state when the gesture ends (debounced), never to the server.
- Viewport culling: only blocks that intersect the visible area (plus a margin) are mounted. Use a simple grid index for hit-testing when the object count grows.
- At most one block is in edit mode at a time. All other blocks render static HTML from their markdown, memoised per block (`React.memo` keyed on `markdown`).
- Zoom limits (for example 0.1 to 4), zoom to the cursor (wheel / trackpad pinch), zoom buttons, "fit to content" and "reset" (100 %).
- No canvas library dependency for now. Lazy-load the canvas component on the board page.

## Text blocks on Lexical (Iteration 4, step 2)
- Files: `lexical/config.ts` (nodes, theme classes, markdown transformers, read-view parse cache), `lexical/block-editor.tsx` (editor + behaviour), `lexical/read-view.tsx`, `lexical/floating-toolbar.tsx`, `lexical/slash-menu.tsx`, `lexical/list-shortcuts.tsx`. Lexical 0.52.0.
- **Storage stays markdown** (`markdown` per block) through Lexical's markdown converters with `shouldPreserveNewLines`: old boards load unchanged (unit test `tests/int/scene.int.spec.ts`). Transformers: headings, to-do list (`- [ ] ` / `- [x] `), bullet and numbered lists, bold, italic, bold+italic, strikethrough, inline code. Anything that markdown cannot store (underline, highlight) is blocked in the editor.
- **Only the block being edited mounts a Lexical editor** (lazy chunk, preloaded for the owner). Every other block is rendered by `ReadView`: markdown -> Lexical JSON with one shared headless editor (cached per markdown string) -> React elements with the same theme classes, so entering edit mode does not move anything. No raw HTML.
- Live shortcuts at the start of a line (`# `, `## `, `### `, `- `, `1. `, `- [ ] `) also work inside list items (`ListShortcutsPlugin`; Lexical itself only applies them to top-level lines). Backspace at the start of a heading turns it into normal text. Enter continues lists, Enter on an empty item ends the list. Paste of plain text applies markdown (pasting into an empty line takes over the first pasted line's type).
- **Inline toolbar** on text selection: bold, italic, strikethrough, inline code (portal in `body`, fixed position, so zoom does not scale it). Ctrl/Cmd+B and +I also work.
- **Slash menu** (`/`): Text, Heading 1-3, Bulleted list, Numbered list, To-do list; typing filters it; Escape closes only the menu. UI components will be added to this menu later.
- **To-do list**: the owner ticks items while editing (click the box). In the read view nobody can tick (visitors can never change a board).
- Portals (toolbar, menu) stop `pointerdown`: React bubbles portal events through the React tree, so otherwise the canvas would treat a toolbar click as a click on empty space and end editing.
- **Saving while editing**: typed text reaches the board 300 ms after typing stops (no history entry), so "Unsaved changes" shows while still editing and Save / Ctrl+S (also inside the editor) includes it. The whole edit is one undo step (the board before editing is the undo point).

## Auto width and click-to-type
- New blocks have `autoWidth: true`: the block is as wide as its longest line (max 2,000 px, then it wraps) and a new line starts only on Enter (Excalidraw/tldraw behaviour). Dragging the left or right border gives the block a fixed width; from then on it wraps at that width. Corner drag keeps auto width and scales the text. The measured width is saved with the text (culling and other screens).
- Click on empty canvas (Select tool) shows a blinking caret; typing any character creates a block right there and keeps typing into it (characters typed before the editor gets focus are buffered and applied, including markdown such as `# Title`). Escape, a drag, or another tool removes the caret. While the caret shows, letters type text instead of switching tools (V/H/T). Double-click and the Text tool still create blocks too.

## Interaction (owner)
- Click on empty canvas and type, or double-click, or the Text tool, creates a text block; double-click a block to edit; click outside or Escape leaves edit mode.
- Select, move (drag), resize (border lines: width/height; corners: scale block and text together), delete (Delete key), bring forward / send back.
- Undo / redo (in-memory history of scene changes, capped).
- Explicit Save, no autosave. Unsaved indicator.

## Read-only mode
Everyone except the owner and admin: pan and zoom only. No selection, no editing, no hover handles.

## As built (Iteration 3)
- Viewport is not part of "unsaved changes"; the current viewport is stored with every Save. The owner opens the board at the saved view (or fit, if no block would be visible); visitors always open it fitted to the content (max 100 %) so every screen size sees the whole lecture.
- Pan: drag empty space (any tool), Hand tool, Space + drag, wheel / trackpad scroll, one-finger touch. Zoom: Ctrl/Cmd + wheel or trackpad pinch (at the cursor), two-finger touch pinch, toolbar buttons, click on % = 100 %, Fit.
- Blocks: click empty space and type, double-click, or Text tool to add; click selects; drag moves; there are no resize handles: dragging the block's border lines (4 edges, about 8 screen px wide) changes only width or height (text keeps its size and wraps again); dragging a corner (about 14 px) scales the whole block in proportion, text included (`scale` on the object, 1 = 15px, 0.25-8, saved only when not 1); with the matching resize cursor, and works on any block without selecting it first; dragging the top or left side moves that side (x/y change too). Hover, selected and editing all show the same thin border (`ring-1 ring-primary/30`). `height` is the block's minimum height: it can be made taller than the text (empty space below), never shorter than the text (text is never cut off), and the block still grows by itself while typing; Enter edits the selected block; Delete removes it; mini toolbar: bring to front, send to back, delete. An empty block is removed when you leave it. Undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y, toolbar), 100 steps, local only.
- Editor: replaced by Lexical in Iteration 4 step 2 (see above).
- Server: `validateScene` (`src/lib/scene.ts`) runs in the Boards `beforeValidate` hook (known block type, finite numbers, max 500 blocks, max 20,000 characters per block).
- Measured on the production build: a 300-block board mounts only the blocks near the screen (4-6 at 100 %), 40 wheel-pan steps take ~1.6 s in a headless browser, and all 300 blocks on screen add about 1.5 MB of JS heap over a 2-block board. The dot grid spaces out when zoomed out. With Lexical (Iteration 4 step 2): pan ~1.8 s, heap 7.6 MB (2 blocks) vs 11.8 MB (300 blocks on screen); Lexical adds about 65 KB gzip of JS for everyone (read view) and about 45 KB more for the owner's editor (separate chunk).

## Later (owner requests, decide together)
- **Emoji:** add an emoji library to the board (picker + emoji in text blocks). Compare the options with the owner first (bundle size, licence, lazy loading, offline data), then build.
- **Typography (do this last):** let instructors style text the way shadcn typeset does: font family (a few curated fonts), font size, maybe weight and colour, per block or per selection. Needs a decision on the data model (block-level style vs inline marks) and on loading fonts without slowing the board.
