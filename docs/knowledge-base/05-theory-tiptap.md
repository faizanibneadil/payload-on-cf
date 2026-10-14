# 05. Theory panel (Tiptap)

Theory is the lecture content for a playground. It is stored as Tiptap JSON in the `theory` (json) field of `playgrounds`.

- Editor: `src/components/playground/TheoryEditor.tsx`, loaded with `next/dynamic` (`ssr: false`).
- Extensions are module-level constants so their identity stays stable across renders.
- Supported: headings, paragraphs, bold / italic / underline / strike, links (always open in a new tab with `rel="noopener noreferrer nofollow"`), bullet and numbered lists with nesting (Tab), blockquote, tables, horizontal rule and code blocks with syntax highlighting (lowlight) and a hover copy button.
- Only the owner (or an admin) gets `editable`; everyone else sees a read-only render. The real guard is Payload access control on `playgrounds.update`.
- Theory is saved only when it changed (`theoryDirty`), together with the rest of the Save request.
- Maximum serialized size is enforced in `savePlaygroundAction` (`MAX_THEORY_CHARS`).

Docs: https://tiptap.dev/docs/editor/getting-started/overview
