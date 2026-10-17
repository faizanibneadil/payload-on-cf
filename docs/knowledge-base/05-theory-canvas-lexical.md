# 05. Theory canvas (Lexical, custom)

> Status: target design. Built in Iterations 3 and 4. The old Tiptap theory editor is removed.

## Goal
Teachers prepare a whole lecture on an infinite canvas and present it. They place text anywhere, type markdown that updates live, draw freehand, add shapes and images, and arrange everything with the same ease as a whiteboard.

## Editor engine
- Built on the Lexical packages that Payload re-exports from `@payloadcms/richtext-lexical` (and `/client`). No separate `lexical` install, no Tiptap. Do not import core Lexical packages directly; they may break in minor Payload releases.
- Payload's `RichTextField` depends on Payload's form context, so we build our own editor component from Lexical building blocks (composer, plugins, nodes, markdown transformers) and use Payload only as storage.
- **Spike first (Iteration 3):** confirm this works outside Payload's form context. Fallback: install `lexical` and `@lexical/*` directly.
- Code blocks (TypeScript, JavaScript, HTML, CSS) with syntax highlighting, language select and a copy button.
- Styling uses shadcn typeset for text blocks.

## "/" menu
Type `/` anywhere in a text block to open the block menu: Paragraph, Heading 1-3, Bullet list, Numbered list, Checklist, Code block (TS/JS/HTML/CSS), Table, Quote, Callout (note/tip/warning), Divider, Image (owner only), Link. Markdown shortcuts also work: `#` + space, a triple backtick, `-`, `>`, `**bold**`.

## Scene model (stored in `playgrounds.data.canvas`)
```
{ version, viewport: { x, y, zoom }, objects: [ ... ] }
object = text | rect | ellipse | arrow | line | path (pen) | image | group
every object: { id, type, x, y, width, height, rotation, zIndex, groupId? }
text: { lexicalState }      image: { mediaId, url }      group: { childIds }
```
- Text blocks are DOM elements (one Lexical editor each) placed inside a transformed container; shapes and pen strokes are SVG.
- Drag, resize, rotate, snap guidelines, group transform and multi-select use Moveable and Selecto (MIT). Spike first in Iteration 4 (React 19). Alignment tools (left/center/right/top/middle/bottom, equal spacing) and group/ungroup are ours.
- Tools: select, hand, pen (smoothed), rectangle, circle, arrow, line, text, eraser. Styling: 6 theme colors, 3 stroke widths, fill none or solid. Undo/redo, pan, zoom, image paste.
- Read-only mode (everyone except the owner/admin): pan and zoom only, no editing.
- The whole scene counts toward the content size limit. Images live in R2 (Media), only a reference is stored in the scene.
- Save is explicit ("Save all"). No autosave.
