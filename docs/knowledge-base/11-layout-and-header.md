# 11. Layout, header and primary bar

> Status: target design. Built in Iteration 1 (shell) and Iteration 5 (editor tab). The old panel/rail layout is removed.

## Header
- Left: product name "Playground" + the playground title (an input for the owner: English characters, spaces become hyphens, max 50; plain text for everyone else).
- Center: tabs `Theory | Editor | Both`.
- Right (owner): Save all, Share (toggle + copy link), user menu (My playgrounds, New playground, Logout).
- Right (signed-in visitor): "View only" badge + user menu. Right (signed out): Sign in button that opens the modal (Sign in / Register tabs).
- Looks like the VS Code title bar.

## Tabs
- **Theory:** the infinite canvas.
- **Editor:** primary bar (activity bar) + file explorer + Monaco + preview tabs + JS console, and a terminal only for React and Next.js templates.
- **Both:** Theory and Editor side by side in resizable panels. Desktop and tablet only; on mobile the tab is hidden.

## Primary bar
Vertical icon bar on the left of the Editor tab. Top: Files. Bottom: Light/Dark toggle (light is the default). Panels everywhere are resizable (react-resizable-panels).

## Editor tab details
- File explorer with files and folders, VS Code-like tabs for open files, Monaco (no auto-closing or auto-renaming of tags).
- Preview: up to 10 preview tabs, each with its own address bar and console. Vanilla runs in a sandboxed iframe. React and Next.js run through Vivari (`@vivari/core`), which also provides the terminal.
- Vivari needs cross-origin isolation (`COOP: same-origin`, `COEP: require-corp`) on the playground pages and the documents it iframes. Do not apply these headers to `/admin` or `/api`. Set them from the Worker (Cloudflare `_headers` examples in the Vivari docs target Pages, not Workers, so test this early).
- If the runtime cannot boot (no isolation, low memory, unsupported browser): the editor stays usable, Run is disabled, and a clear message names a supported browser. Vanilla always works.

## Visitors
Visitors can edit code locally and run the preview. Their edits are stored in their browser (IndexedDB/localStorage, keyed by slug and user id). A "Reset to original" button restores the owner's version. They can never save to the server.
