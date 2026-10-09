# Vivari Studio Port Plan & File Mapping

## Overview
Porting Vivari Studio (`packages/studio` @ commit `6f9a27849fff004c5c4570690611289f1da7aad5`) into Next.js App Router + Payload CMS v3 + Cloudflare D1/R2 on OpenNext.

---

## 1. File-by-File Mapping

| Studio Source (`/tmp/vivari-ref/packages/studio/`) | Port Destination (`src/`) | Description / Changes |
|---|---|---|
| `src/index.css` | `src/app/globals.css` | Global styles, Tailwind v4, oklch theme tokens, `.vv-*` classes, scrollbars, Monaco/xterm hosts. |
| `src/vv/controller.ts` | `src/lib/vv/controller.ts` | `IdeController` singleton. Extended for sync status, theory state, batch API calls. |
| `src/vv/kernel.ts` | `src/lib/vv/kernel.ts` | `@vivari/core` re-exports (`KernelBridge`, `isCrossOriginIsolated`, `resetVfs`). |
| `src/vv/editor-status.ts` | `src/lib/vv/editor-status.ts` | Editor status store (cursor, selection, language, indent). |
| `src/vv/status-message.ts` | `src/lib/vv/status-message.ts` | Transient status message store. |
| `src/vv/scm-session.ts` | `src/lib/vv/scm-session.ts` | Git session manager store. |
| `src/vv/debug-session.ts` | `src/lib/vv/debug-session.ts` | CDP Debugger session store. |
| `src/vv/run-phase.ts` | `src/lib/vv/run-phase.ts` | Run phase state store. |
| `src/vv/boot-marks.ts` | `src/lib/vv/boot-marks.ts` | Boot timing telemetry store. |
| `src/vv/templates.ts` | `src/lib/vv/templates.ts` | Starter templates definition. |
| `src/vv/templates-lazy.ts` | `src/lib/vv/templates-lazy.ts` | Lazy template loader. |
| `src/vv/import-remote.ts` | `src/lib/vv/import-remote.ts` | GitHub / npm remote project importer. |
| `src/vv/git-fs.ts` | `src/lib/vv/git-fs.ts` | Git filesystem adapter. |
| `src/vv/git-config.ts` | `src/lib/vv/git-config.ts` | Git configuration store. |
| `src/vv/s3-app-source.js` | `src/lib/vv/s3-app-source.js` | S3 remote app sources. |
| `src/vv/notebook/*` | `src/lib/vv/notebook/*` | Notebook kernel & execution (Phase B). |
| `src/components/ide/AppShell.tsx` | `src/components/ide/AppShell.tsx` | Main IDE workspace shell. Extended with Theory panel view. |
| `src/components/ide/TitleBar.tsx` | `src/components/ide/TitleBar.tsx` | Title bar. Modified: "Playground", editable title, Share/Fork/Login/Account. |
| `src/components/ide/ActivityBar.tsx` | `src/components/ide/ActivityBar.tsx` | Left icon bar. Added: "Theory" button (`book-open`). |
| `src/components/ide/Explorer.tsx` | `src/components/ide/Explorer.tsx` | File explorer tree and context menus. |
| `src/components/ide/SearchPane.tsx` | `src/components/ide/SearchPane.tsx` | Workspace text search panel. |
| `src/components/ide/SourceControlPanel.tsx` | `src/components/ide/SourceControlPanel.tsx` | Git source control panel. |
| `src/components/ide/DebugPanel.tsx` | `src/components/ide/DebugPanel.tsx` | CDP debugger panel. |
| `src/components/ide/TheoryPanel.tsx` | `src/components/ide/TheoryPanel.tsx` | New component: Lexical editor for Theory sidebar view. |
| `src/components/ide/EditorGroup.tsx` | `src/components/ide/EditorGroup.tsx` | Monaco editor tabs host. |
| `src/components/ide/TerminalPanel.tsx` | `src/components/ide/TerminalPanel.tsx` | Bottom panel with xterm terminals, Console, Ports. |
| `src/components/ide/PreviewPanel.tsx` | `src/components/ide/PreviewPanel.tsx` | Preview tabs & chii/chobitsu DevTools. |
| `src/components/ide/StatusBar.tsx` | `src/components/ide/StatusBar.tsx` | Bottom status bar. |
| `src/components/ide/StatusBarPickers.tsx` | `src/components/ide/StatusBarPickers.tsx` | Line/col, Indent, Language pickers. |
| `src/components/ide/CommandPalette.tsx` | `src/components/ide/CommandPalette.tsx` | `cmdk` command palette (⇧⌘P / ⌘P). |
| `src/components/ide/Home.tsx` | `src/components/ide/Home.tsx` | Home / landing page view at `/`. |
| `src/components/ide/ImportRemoteDialog.tsx` | `src/components/ide/ImportRemoteDialog.tsx` | Import modal. |
| `src/components/ide/NotebookView.tsx` | `src/components/ide/NotebookView.tsx` | Notebook editor view. |
| `src/components/ide/fileIcon.tsx` | `src/components/ide/fileIcon.tsx` | VS Code / Lucide file type icons. |
| `src/components/ide/templateIcons.tsx` | `src/components/ide/templateIcons.tsx` | Framework template icons. |
| `src/components/ide/useIde.ts` | `src/components/ide/useIde.ts` | Hook wrapping `IdeController` with `useSyncExternalStore`. |
| `src/components/ide/IdeProvider.tsx` | `src/components/ide/IdeProvider.tsx` | Controller context provider. |
| `src/components/ui/*` | `src/components/ui/*` | Base UI (`@base-ui/react`) shadcn `base-nova` UI components. |
| `public/__vv-bridge.html` | `public/__vv-bridge.html` | Kernel bridge frame. |
| `public/__vv-preview-boot.html` | `public/__vv-preview-boot.html` | Preview iframe boot loader. |
| `public/devtools-host.html` | `public/devtools-host.html` | DevTools host iframe. |

---

## 2. Key Decisions & Technical Choices

1. **Base UI Primitives (No Radix):** All `src/components/ui` components ported to `@base-ui/react` shadcn `base-nova` primitives.
2. **Icons:** `lucide-react` for standard UI icons. Iconify `vscode-icons` rendered as inline SVGs / bundled icon components.
3. **Monaco Worker Setup:** Bundler-compatible `new Worker(new URL('...', import.meta.url))` with fallback to web worker configuration.
4. **Data Model:**
   - Collection `playgrounds`: `title`, `slug`, `owner`, `theory` (richText), `forkedFrom`. (`files` JSON removed).
   - Collection `playground-files`: `playground` (rel), `path` (string), `content` (text), `size` (number). Unique index on `(playground, path)`.
5. **Payload Endpoints:** `PATCH /api/playgrounds/:id/files` attached directly to the `playgrounds` collection in `src/collections/Playgrounds.ts`.
6. **Save Semantics:** Immediate VFS update (non-blocking) followed by background REST call for authenticated owners.
7. **Auth & Registration:** `/register` page reusing Payload UI components, backed by server action with `overrideAccess: true`. `admin.components.afterLogin` links to `/register`.

---

## 3. Risks & Mitigations

- **Cloudflare Worker Static Asset Limits & Vendor Feasibility Spike:**
  - Measured Phase A Vendor Assets:
    - `corepack-pack.bin`: 120 KB
    - `npm-pack.bin`: 2.7 MB
    - `yarn-pack.bin`: 1.2 MB
    - `pnpm-pack.bin`: 3.5 MB
    - `tsgo-pack.bin`: 11 MB
    - Total: 5 files, ~18.5 MB total compressed size.
  - Cloudflare Workers Static Asset Limits: Max 25 MB per file, max 20,000 files per deployment.
  - Decision: All Phase A vendor assets fit well within Cloudflare Workers limits (largest file is 11 MB < 25 MB; 5 files << 20,000 files). Servable directly from `public/vendor/` as static assets.
- **COOP/COEP Headers:** Strictly scoped to `/`, `/p/*`, `/sw.js`, `/__vv-*.html`, `/devtools*` to avoid breaking `/admin`, `/api`, and `/register`.
- **D1 Parameter Limits:** D1 limits parameter count to 100 per query. Batch ops in `PATCH /api/playgrounds/:id/files` are chunked server-side.
