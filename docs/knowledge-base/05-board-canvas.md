# 05. Board canvas (text blocks with live markdown)

> Status: target design, built in Iteration 3. Lexical, Tiptap and the "/" menu are not used. Further tools are decided in the research iteration (see the end of this file).

## Goal
An instructor prepares a lecture on an infinite canvas: places text blocks anywhere, types markdown that turns into formatted text while typing, and moves around the board with pan and zoom. It must feel professional and stay fast and light on memory with many blocks.

## Scene model (stored in `boards.data.canvas`)
```
{ version: 1, viewport: { x, y, zoom }, objects: [ ... ] }
object = { id, type: 'text', x, y, width, height, zIndex, markdown }
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

## Live markdown in text blocks
- Own small `contentEditable` block editor, no new dependency.
- Input rules at the start of a line, applied as soon as the space is typed:
  - `# ` / `## ` / `### ` -> heading 1 / 2 / 3
  - `- ` -> bullet list item
  - `1. ` -> numbered list item (Enter continues the list, Enter on an empty item ends it)
  - anything else -> paragraph
- Backspace at the start of a formatted line turns it back into a paragraph.
- The block keeps the markdown string in sync; a tiny in-house parser renders the read view (headings, paragraphs, bullet and numbered lists). Escape all text (no raw HTML).
- Inline formatting (`**bold**`, `` `code` ``, links) is optional for Iteration 3; add it only if it stays small.

## Interaction (owner)
- Double-click on empty canvas creates a text block; double-click a block to edit; click outside or Escape leaves edit mode.
- Select, move (drag), resize (width; height follows content), delete (Delete key), bring forward / send back.
- Undo / redo (in-memory history of scene changes, capped).
- Explicit Save, no autosave. Unsaved indicator.

## Read-only mode
Everyone except the owner and admin: pan and zoom only. No selection, no editing, no hover handles.

## Open research (Iteration 4, with the owner)
- Is a Lexical-based editor needed for richer text, or is the plain block editor enough?
- Excalidraw (MIT) and tldraw (paid licence for production) compared with our own engine.
- Drawing tools (pen, shapes, arrows), images (R2), multi-select, grouping, alignment and snapping (for example Moveable / Selecto).
- Presenting a lecture (frames / slides on the canvas).
