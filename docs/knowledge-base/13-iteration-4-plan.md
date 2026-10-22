# 13. Iteration 4 plan (shape being finalised with the owner)

Items marked **open** wait for the owner's answer. Nothing is built until the owner says go.

## Decided by the owner (October 2026)
- **Tools:** Rectangle, Ellipse, Line, Pen (freehand, smoothing with `perfect-freehand`), Image, Eraser, plus the existing Select, Hand, Text. Arrow tool: proposed earlier, see "Later".
- **Many at once:** multi-select (selection box, Shift+click), then move, resize and delete together.
- **Copy/paste** (Ctrl+C / Ctrl+V). No separate Duplicate button.
- **Style panel:** opens only while a shape or another stylable element is selected (stroke colour, fill, stroke width, opacity).
- **Alignment guides** while moving and resizing.
- **Engine:** own engine (no tldraw/Excalidraw packages). Shapes are SVG inside the existing world layer; a shape registry, tool state machine, selection/transform, spatial index, and a scene store outside React.
- **Images:**
  - Upload to R2. Paste from the clipboard: image data is uploaded; an image copied from a website (link/HTML only) is downloaded by the server and stored in R2.
  - Instructor plan: the browser shrinks the image before upload. Paid plan (future, not now): keep the original.
  - Instructors: max 10 images per board. Admin: no limit.
  - Served from R2 through this project (no extra domain or service).
  - An image removed from a board is deleted from R2; images of a deleted board or user are deleted too.
- **Text blocks rebuilt on Lexical** (replaces the custom editor):
  - Lexical markdown converters keep the `#`, `-`, `1.` shortcuts.
  - Code block in the style of shadcn's `code-block` (Base UI version: plain code, line numbers, copy button; highlighting with Shiki's JavaScript engine, loaded per language).
  - Inline toolbar on text selection (bold, italic, ...).
  - Tables.
  - Slash menu (headings, lists, to-do list, UI elements).
  - React UI components: only the mechanism now; which components come later.
- **Text block width:** no fixed width. A new block grows with the text and breaks lines only on Enter, like Excalidraw/tldraw.
- **Lectures are mostly text** (definitions, theory); shapes/drawings are rare. Storage and performance are planned for long text.
- **Playwright:** move the browser tests to the Playwright Test runner (videos, traces, HTML report) and configure the Playwright MCP server for debugging.

## Later (backlog, do not build now)
- Arrows that stay attached to shapes (important, later).
- Frames (counted as a tool; they may become presentation slides).
- Presentation mode.
- Paid plan: original images without shrinking.
- Which React UI components to offer.
- AI lecture design (after product launch and feedback).

## Agent proposal for the remaining points (to confirm)
- **"Type anywhere":** the whole canvas as one Lexical editor is not a fit (Lexical is a top-to-bottom document; free positions, shapes and culling would fight it, and one huge editor gets slow). Proposal: keep blocks but make them invisible to the instructor. Click on empty canvas and start typing creates a block there. One block can hold a whole section (headings, lists, code, tables, components), so few blocks are needed.
- **Width after a manual resize:** a block grows with the text until the instructor drags its side border; from then on it has that width and wraps (tldraw behaviour).
- **Image size (instructor):** longest side 1920 px, WebP, quality about 0.82; files over 20 MB before shrinking are refused. Website images: max 10 MB, image types only.
- **Image serving:** a small Worker route that streams the file from R2 without loading Payload (cheap on the free plan), with long browser caching. The public `r2.dev` URL is rate-limited and not meant for production, so it is not used.
- **Storage format:** markdown through Lexical's converters, plus small custom converters for tables, code, to-do lists and UI components. Markdown is compact (about 1.8 MB is several hundred pages of text), so text-heavy lectures fit in the row; images live in R2, not in the row.
- **UI component mechanism:** a Lexical decorator node plus a slash-menu entry. One demo component (for example a Callout) to prove it works (**open**: yes/no).

## Proposed order (each step: build, all tests, push to dev, owner verifies)
1. Playwright Test runner (move the suites, videos/traces/report) + Playwright MCP config.
2. Text blocks on Lexical: same features as today first (live markdown, dynamic width, type anywhere), then inline toolbar, slash menu, to-do list.
3. Code block (shadcn style) and tables in text blocks.
4. Engine upgrade: scene store, multi-select, selection box, copy/paste, alignment guides.
5. Shapes (rectangle, ellipse, line) + style panel.
6. Pen + eraser.
7. Images (upload, paste, website images, limits, R2 delete).
8. UI component mechanism (+ demo component if wanted).
