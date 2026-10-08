# 11. Vivari Studio reference (the UI we are porting)

Source (read-only reference, MIT licensed): https://github.com/maitrungduc1410/vivari/tree/master/packages/studio
Pinned commit studied: `6f9a27849fff004c5c4570690611289f1da7aad5` (2026-10-05). Clone it into a temp folder OUTSIDE this repo (e.g. `/tmp/vivari-ref`) and read it; never commit it.

This file supersedes file 08 for everything about the Practical panel. File 08 describes the small `<Vivari>` component API; the Studio uses the lower-level `KernelBridge` instead.

## 1. What Studio is
A VS Code style IDE that runs real Node projects in the browser tab. Stack: Vite 8, React 19 (React Compiler), Tailwind v4, shadcn (style `base-nova`, **Base UI** `@base-ui/react`), lucide + vscode-icons (via `unplugin-icons`), `next-themes`, `react-resizable-panels`, `cmdk`, `sonner`, Monaco, xterm.js, isomorphic-git, chobitsu + chii (in-browser DevTools).
Its own README: `packages/studio/README.md`.

## 2. Architecture (copy this model)
- `src/vv/controller.ts` (3,870 lines): `IdeController`, an imperative singleton exposed as an external store; React reads it with `useSyncExternalStore` (`components/ide/useIde.ts`, `IdeProvider.tsx`). One kernel worker per page, so one controller per page (module-level singleton protects against StrictMode double mount).
- `src/vv/kernel.ts`: re-exports `KernelBridge`, `isCrossOriginIsolated`, `resetVfs`, `KernelMessage` from `@vivari/core`. In Studio, `@vivari/core` is a Vite alias to monorepo SOURCE. In this repo use the published npm package `@vivari/core` (1.1.1 at time of writing). **Verify** the published package exports `KernelBridge`; if not, report it and stop.
- Small stores: `editor-status.ts` (cursor/indent/language), `status-message.ts` (transient status text), `scm-session.ts` (git), `debug-session.ts` (CDP debugger), `run-phase.ts`, `boot-marks.ts`.
- `src/vv/templates.ts` (11k lines) + `templates-lazy.ts`: starter templates (large; lazy load).
- `src/vv/notebook/*` + `NotebookView.tsx`: Python/Jupyter notebooks (needs Pyodide vendor assets).
- `src/vv/import-remote.ts`: import from GitHub repo / npm package (fetches `api.github.com`, `raw.githubusercontent.com`, `registry.npmjs.org`; all send CORS, so they work under COEP).
- `src/vv/s3-app-source.js`, `git-fs.ts`, `git-config.ts`: git filesystem glue and remote app sources.

## 3. UI components to port (`src/components/ide/`)
AppShell, TitleBar, ActivityBar, Explorer (702 lines), SearchPane, SourceControlPanel, DebugPanel, EditorGroup, TerminalPanel, PreviewPanel, StatusBar, StatusBarPickers (Go to Line, indentation, language mode), CommandPalette, Home (763 lines), ImportRemoteDialog, ShareLoadingOverlay, NotebookView, fileIcon, templateIcons, useIde, IdeProvider.
shadcn UI parts in `src/components/ui/`: alert-dialog, badge, button, command, context-menu, dialog, dropdown-menu, input-group, input, resizable, scroll-area, select, separator, sonner, tabs, textarea, tooltip. `components.json`: style `base-nova`, baseColor `neutral`, cssVariables true, iconLibrary lucide.
Theme tokens and special CSS live in `src/index.css` (oklch tokens, `.vv-*` classes for Monaco host, xterm host, breakpoint glyphs, resize handle highlight `#007fd4`). Port ALL of it into the Next app's global CSS.

## 4. Feature inventory (nothing may be dropped silently)
Layout and shell: title bar, activity bar, resizable sidebar / editor / bottom panel / preview, layout toggles (sidebar ⌘B, panel ⌘J, preview ⌥⌘B), status bar, command palette (⇧⌘P commands, ⌘P files), keyboard shortcuts in `AppShell.tsx` (⇧⌘E explorer, ⇧⌘F search, ⇧⌘G source control, ⌘` panel, ⌘S save, ⇧⌘C new terminal, ⌥Z word wrap), `beforeunload` guard, light/dark/system theme that also themes Monaco and xterm (`applyUiTheme`).
Explorer: multi-root workspace folders, file tree, new file/folder, rename, delete, copy/cut/paste, drag and drop move, drop files from the OS, import folder, copy path, open terminal here, download as zip, context menus.
Editor: Monaco tabs (preview tab, pin, reorder, close), dirty indicator, save, image viewer, directory tab, diff tabs (Source Control), notebook tabs, go to line, language mode picker, indentation picker, word wrap, find/replace, breakpoint gutter.
Search: workspace text search with case/word/regex options, include/exclude globs, replace.
Source control: isomorphic-git (init, status, stage/unstage, commit, history, branches, diff), badge with changed-file count on the Activity Bar.
Run and Debug: breakpoint debugger using CDP over the kernel bridge (Call Stack, Variables, Watch, Breakpoints), "Debug mode" toggle.
Bottom panel: Console / Terminal / Ports tabs, multiple xterm terminals (real npm/pnpm/yarn/node inside the VM), kill/clear terminal.
Preview: multiple browser-like tabs (add, activate, close, close others/right/all via context menu), address bar (local only), back/forward/reload, open in external tab, in-browser DevTools (chobitsu backend + chii frontend, vertical split), run-phase progress, theme-aware `color-scheme`.
Home: start blank, start from template, import folder, import from GitHub/npm, recent projects, runtime boot progress, "Reset everything" (wipes OPFS-mirrored VFS and dependency cache), memory measurement.
Projects: create from template, open, run, export zip, share (Studio's own `#share=` link; REPLACED here, see the main prompt).
Notebook/Python: separate phase (needs Pyodide vendor assets, large).

## 5. Porting map (Vite to Next.js)
| Studio | Next.js project |
|---|---|
| `~icons/lucide/*` (unplugin-icons) | `lucide-react` (same glyphs; check renamed icons such as `panel-left-dashed`) |
| `~icons/vscode-icons/*` (file/folder icons, 50 imports) | keep Iconify `vscode-icons` set compiled to inline SVG at build (unplugin-icons has a webpack plugin) or a small generated icon module. No runtime CDN (COEP) |
| `import.meta.env.DEV` | `process.env.NODE_ENV !== "production"` |
| `?worker` imports for Monaco workers | `new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url))` style (works with webpack 5; verify Turbopack) and set `self.MonacoEnvironment.getWorker` |
| `.svg/.png/.jpg` asset imports in `templateIcons.tsx` | files in `public/` or Next static imports |
| `main.tsx` + `ThemeProvider` | `app/layout.tsx` + `next-themes` provider; the whole IDE is a client-only tree (`next/dynamic`, `ssr: false`) |
| `index.html` / `#root` height rules | `html, body { height: 100% }` and a full-height shell |
| Vite plugins `swScope`, `serveDevtools` | `next.config` headers (COOP/COEP only on IDE routes; `Service-Worker-Allowed: /` on `/sw.js`), and static copy of `chobitsu.js` to `public/vv-devtools/` and chii `public/` to `public/devtools/` (script on `postinstall`/`prebuild`) |
| `vvPrecacheAndHints` (precache manifest injected into `sw.js`) | optional optimisation; first make the plain `sw.js` from `@vivari/core` work |
| `public/__vv-bridge.html`, `__vv-preview-boot.html`, `devtools-host.html` | copy into `public/` (served same-origin with COOP/COEP) |
| Tailwind via `@tailwindcss/vite` | `@tailwindcss/postcss` (already required) |
| React Compiler | optional; only enable if Next/OpenNext build stays green |

## 6. Vendor assets (important, heavy)
Package managers, tsgo, Pyodide, ruff, sqlite, per-template lockfiles and dependency snapshots are NOT in the npm package. Studio builds them with repo scripts (`scripts/vendor-*.mjs`, `gen-template-locks.mjs`, `gen-depcache.mjs`) into `packages/studio/public/vendor/` (gitignored). Without `/vendor/...` the in-VM terminal has no `npm`/`pnpm`/`yarn`.
- Phase A: reproduce the JS/Node vendor set (npm, yarn, pnpm, corepack, tsgo; locks/depcache if feasible) with a script in this repo, run before `next build` in CI.
- Phase B (only if platform limits allow): Pyodide, ruff, sqlite, notebooks.
- **Verify Cloudflare static-asset limits** (file count and max file size per deployment) before shipping the vendor tree to Workers; if exceeded, host the vendor tree on R2/another origin with CORS + CORP headers and point the kernel at it, and report the decision.

## 7. Known pitfalls
- COEP `require-corp`: every subresource must be same-origin or send CORP/CORS. Self-host fonts (Studio uses `@fontsource-variable/geist`; in Next use the same package or `next/font/local`, not Google-hosted).
- The preview iframe starts at `about:blank` then navigates (see `PreviewFrame` comment); keep that behaviour or the SW may miss the first request.
- Monaco is heavy: load it only on the client, lazily, on the IDE routes only. Keep it out of server bundles (Workers 3 MB limit on the free plan).
- Studio keeps its project registry in `localStorage` (`REGISTRY_KEY`) and files in an OPFS-mirrored VFS. For DB-backed playgrounds the database is the source of truth (see main prompt).
