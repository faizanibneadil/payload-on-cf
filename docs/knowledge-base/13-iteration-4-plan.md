# 13. Iteration 4 plan (DRAFT, shape under discussion with the owner)

Nothing here is built yet. Items marked **open** wait for the owner's answer. When the shape is final, this file gets the task list.

## Owner requirements (October 2026)
1. Shapes: rectangle, circle, plus whatever else is important (agent proposes).
2. Images: upload to R2; paste an image copied from anywhere; an image removed from a board is deleted from R2.
3. Presentation mode: later (backlog), after deciding how slides pick blocks.
4. Own engine, studied from tldraw/Excalidraw, built only as far as we need, smooth.
5. Text blocks on Lexical: code block (shadcn's new code block), React UI components inside lectures, inline toolbar on selection (bold, italic, ...), tables, slash menu (headings, lists, to-do list, UI elements).
6. Proper UI tests with Playwright.

## Agent proposal (to confirm)

### Tools on the toolbar
- Already there: Select, Hand, Text.
- Proposed core: Rectangle, Ellipse, Line, Arrow, Freehand pen, Image, Eraser.
- **Open:** diamond/triangle, sticky note, frame (a named area; could later become a presentation slide), arrows that stay attached to shapes when they move, laser pointer.

### Editing features the engine needs for these tools
- Multi-select (drag a box, Shift+click), move/resize/delete many at once, duplicate (Ctrl+D), copy/paste inside and between boards.
- Style panel: stroke colour, fill colour, stroke width, opacity (fixed palette that works in light and dark).
- Snapping/alignment guides while moving.
- **Open:** rotation; grouping; locking a block.

### Engine approach
- Keep the current design (one transformed world layer, culling, history) and add shapes as SVG inside the same layer (the tldraw approach, which fits rich text and React components living in the DOM). Excalidraw draws on a 2D canvas instead, which is faster for thousands of strokes but cannot host rich text or React components.
- Engine parts to build: shape registry (each type: geometry, hit test, render, handles), tool state machine, selection and transform, a spatial index for hit testing, a scene store outside React so panning never re-renders the whole board.
- **Open:** freehand smoothing with the small MIT library `perfect-freehand` (used by both tldraw and Excalidraw) or our own smoothing.

### Images
- Paste: clipboard image data is uploaded straight away. If only a link or HTML `<img>` is pasted, either the server fetches and stores the image, or only the link is kept (**open**).
- Before upload the browser shrinks the image (max side and WebP), to save R2 space and CPU (the Worker never resizes images: no sharp on Workers).
- Delete rule (**open**): delete from R2 on Save when the image is no longer in the board (Undo before Save still works); delete all images when a board or user is deleted; a cleanup removes uploads that were never saved within 24 h.
- Serving (**open**): through the Worker (counts against requests/CPU) or a public R2 custom domain such as `media.devslix.com` (free egress, no Worker CPU).
- Limits (**open**): max image size, max images per board, storage per instructor.

### Text blocks on Lexical
- Only the block being edited mounts a Lexical editor; all other blocks render read-only from saved data without Lexical, so 300 blocks stay smooth (same idea as today).
- Lexical packages: code (with syntax highlighting), table, list (incl. to-do), markdown shortcuts (keeps today's `#`, `-`, `1.`), plus our own floating toolbar and slash menu built on Lexical's typeahead plugin.
- **Open:** storage format. Lexical JSON keeps everything (tables, components) but is 5-10x larger than markdown, closer to the D1 row limit (2 MB). Options: Lexical JSON per block; or markdown plus JSON only for blocks that need it.
- **Open:** which React UI components first (callout, tabs, accordion, quiz, ...).
- **Open:** existing boards are markdown; they get converted automatically when first opened.

### Playwright
- Today: three suites written as plain Node scripts on the Playwright library, plus the live-check.
- Proposal: move to the Playwright Test runner (`@playwright/test`, already installed): clear pass/fail per test, automatic waiting, a trace and video of every failure, HTML report, screenshot comparison for the canvas. Run locally and before every merge to `main`, not on every push (rule 5).

### Suggested order (each step: build, test, push to dev, owner verifies)
1. Playwright Test runner + current suites moved over.
2. Engine upgrade: scene store, multi-select, selection box, style panel basics.
3. Shapes.
4. Images (R2).
5. Lexical text blocks (toolbar, slash menu, tables, code, to-do).
6. React UI components in lectures.
