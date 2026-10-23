# 13. Iteration 4 plan (shape being finalised with the owner)

Items marked **open** wait for the owner's answer. Nothing is built until the owner says go.

## Decided by the owner (October 2026)
- **Tools:** Rectangle, Ellipse, Line, Pen (freehand, smoothing with `perfect-freehand`), Eraser, plus the existing Select, Hand, Text. Arrow tool: proposed earlier, see "Later".
- **Many at once:** multi-select (selection box, Shift+click), then move, resize and delete together.
- **Copy/paste** (Ctrl+C / Ctrl+V). No separate Duplicate button.
- **Style panel:** opens only while a shape or another stylable element is selected (stroke colour, fill, stroke width, opacity).
- **Alignment guides** while moving and resizing.
- **Engine:** own engine (no tldraw/Excalidraw packages). Shapes are SVG inside the existing world layer; a shape registry, tool state machine, selection/transform, spatial index, and a scene store outside React.
- **Images on the canvas: removed from the plan** (owner, October 2026). No image tool, no paste/upload of images on the canvas, no R2 image pipeline. The R2 binding and the `@payloadcms/storage-r2` package stay. Payload's `media` collection and the R2 configuration stay exactly as they are and are not touched (owner decision).
- **Text blocks rebuilt on Lexical** (replaces the custom editor):
  - Lexical markdown converters keep the `#`, `-`, `1.` shortcuts.
  - Code block in the style of shadcn's `code-block` (Base UI version: plain code, line numbers, copy button; highlighting with Shiki's JavaScript engine, loaded per language).
  - Inline toolbar on text selection (bold, italic, ...).
  - Tables.
  - Slash menu (headings, lists, to-do list, UI elements).
  - React UI components: the mechanism plus one demo component (Callout); which real components come later.
  - **Links:** proper link support.
    - Link fields: label (text shown), URL, open in new tab (`target`), `rel` (e.g. `noopener noreferrer`, `nofollow`).
    - When the cursor is on a link or the link is focused/clicked while editing, a small popover appears at the link: it shows the label, or the URL when there is no label (one line, max width, long text truncated), with **Edit** and **Remove** buttons.
    - Edit opens a popover in the same place with the fields above. Similar to Payload's own Lexical link feature.
- **Text block width:** no fixed width. A new block grows with the text and breaks lines only on Enter, like Excalidraw/tldraw.
- **Lectures are mostly text** (definitions, theory); shapes/drawings are rare. Storage and performance are planned for long text.
- **Playwright:** move the browser tests to the Playwright Test runner (videos, traces, HTML report) and configure the Playwright MCP server for debugging.

## Later (backlog, do not build now)
- Arrows that stay attached to shapes (important, later).
- Frames (counted as a tool; they may become presentation slides).
- Presentation mode.
- Images on the canvas (removed for now).
- Which React UI components to offer.
- AI lecture design (after product launch and feedback).

## Agent proposal for the remaining points (to confirm)
- **"Type anywhere" (accepted):** the whole canvas as one Lexical editor is not a fit (Lexical is a top-to-bottom document; free positions, shapes and culling would fight it, and one huge editor gets slow). Proposal: keep blocks but make them invisible to the instructor. Click on empty canvas and start typing creates a block there. One block can hold a whole section (headings, lists, code, tables, components), so few blocks are needed.
- **Width after a manual resize:** a block grows with the text until the instructor drags its side border; from then on it has that width and wraps (tldraw behaviour).
- **Storage format:** markdown through Lexical's converters, plus small custom converters for tables, code, to-do lists and UI components. Markdown is compact (about 1.8 MB is several hundred pages of text), so text-heavy lectures fit in the row (accepted: "Lexical ka tareeqa sahi he").
- **UI component mechanism:** a Lexical decorator node plus a slash-menu entry, with a Callout demo (accepted).
- **`media` collection (decided):** keep it and the R2 config untouched. (Note given to the owner: the R2 storage plugin is installed but not configured in `payload.config.ts`.)
- **Links in read-only view (decided):** visitors can click links (they open with the link's target); only the board creator can change a link (popover while editing).

## Proposed order (each step: build, all tests, push to dev, owner verifies)
1. Playwright Test runner (move the suites, videos/traces/report) + Playwright MCP config. **Done, verified by the owner.**
2. Text blocks on Lexical: same features as today first (live markdown, dynamic width, type anywhere), then inline toolbar, slash menu, to-do list. **Done (pushed to dev, waiting for owner check).**
3. Code block (shadcn style) and tables in text blocks.
4. Engine upgrade: scene store, multi-select, selection box, copy/paste, alignment guides.
5. Shapes (rectangle, ellipse, line) + style panel.
6. Pen + eraser.
7. Links (label, target, rel, hover/focus popover with Edit/Remove).
8. UI component mechanism + Callout demo.
