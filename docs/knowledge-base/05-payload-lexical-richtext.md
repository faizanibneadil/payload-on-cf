# 05. Payload Lexical rich text (Theory panel)

Docs: https://payloadcms.com/docs/lexical/overview , https://payloadcms.com/docs/rich-text/official-features , https://payloadcms.com/docs/lexical/converters (page name: verify)

## Toolbar features **[Docs]**
- `InlineToolbarFeature` (floating toolbar on text selection) is part of the **default** features.
- `FixedToolbarFeature` is **not** default. So "inline toolbar only" means: do not add `FixedToolbarFeature`.
```ts
import { lexicalEditor, InlineToolbarFeature } from '@payloadcms/richtext-lexical'
editor: lexicalEditor({
  features: ({ defaultFeatures }) => [...defaultFeatures, InlineToolbarFeature()],
})
```
If you override `features` with an array that excludes `defaultFeatures`, add `InlineToolbarFeature()` explicitly. Do not add `FixedToolbarFeature()`.

## Markdown
- Markdown shortcuts while typing (e.g. `# `, `- `, `**bold**`) come from Lexical's markdown transformers in the official features. **[Verify which features enable them]**
- Conversions (Markdown to Lexical, Lexical to Markdown, HTML to Lexical) use a **headless editor** and helpers such as `convertMarkdownToLexical`, `convertLexicalToMarkdown`, `convertHTMLToLexical`, with `editorConfigFactory` from `@payloadcms/richtext-lexical`. **[Docs, verify exact names in installed version]**

## Rendering (read-only)
```tsx
import { RichText } from '@payloadcms/richtext-lexical/react'
<RichText data={playground.theory} />
```
**[Docs]** `RichText` renders serialized Lexical JSON in a frontend component. This is the safest read-only path for non-owners.

## The hard part: editing on the frontend
Payload's Lexical editor is built as an **admin-panel field**. It depends on Payload's admin providers (form state, config, translations, field context). Mounting the exact same editor on a public frontend page is **not a documented, supported path**.

### Decision procedure (time-box the first step)
1. **Try official components.** Look in `@payloadcms/richtext-lexical/client` exports and Payload's "Lexical in the frontend" discussions. If a standalone editor component exists and works without the admin providers, use it.
2. **Fallback (expected outcome):** build the editor with `@lexical/react` on the frontend:
   - Use Lexical nodes compatible with Payload's serialized format (root, paragraph, heading, text, list, listitem, quote, link, code, horizontalrule).
   - Enable `MarkdownShortcutPlugin` with the standard transformers.
   - Build a small **floating (inline) toolbar** shown on text selection (bold, italic, underline, code, link, heading toggles). No fixed toolbar.
   - Serialize with `editor.getEditorState().toJSON()` and save into the `theory` richText field.
3. **Compatibility checks (must test, not assume):**
   - Round trip: save JSON from the frontend editor, open it in Payload admin (the field must load), and render it with `<RichText>`.
   - Payload's `link` node stores URL data under `fields` (`linkType`, `url`, `newTab`), unlike plain Lexical `LinkNode`. Map link serialization accordingly, or exclude links in v1.
   - Match the `version` and node `type` strings Payload expects.
4. **Last resort (only if 1-3 fail):** keep the DB field as Payload `richText`, but edit through Markdown text and convert with the headless helpers on save and load. Document the trade-off.

Record the decision and evidence in the final summary.

## Performance
- Load the editor with `next/dynamic` and `ssr: false`; render a skeleton until ready.
- Read-only mode should avoid loading the editing bundle (use `<RichText>` server-side).
- Do not mount the editor when the Theory tab is hidden unless state preservation requires it; keep unsaved edits in a store (e.g. React state/Zustand) so switching tabs does not lose them.
