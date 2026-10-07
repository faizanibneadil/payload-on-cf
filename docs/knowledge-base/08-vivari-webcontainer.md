# 08. Vivari (in-browser code environment)

Docs (read these first):
- Intro: https://vivari.run/docs/
- Getting started: https://vivari.run/docs/getting-started
- Core API: https://vivari.run/docs/core-api
- React: https://vivari.run/docs/react
- Embedding & self-hosting: https://vivari.run/docs/embedding
- Cross-origin isolation: https://vivari.run/docs/cross-origin-isolation
- Deployment: https://vivari.run/docs/deployment
- How it works: https://vivari.run/docs/how-it-works

All facts below marked **[Docs]** were read from these pages on 2026-10-08.

## Install **[Docs]**
```bash
pnpm add @vivari/react @vivari/core react
```
`@vivari/core` is a **peer** dependency: install it yourself so there is exactly one copy. Two copies means two kernels and a preview Service Worker registered twice.

## Browser-only
Every module has `"use client"`. The kernel runs only in the browser; there is no SSR of the VM. On the server `useVivari()` reports `status: "idle"` and renders nothing. Load the practical panel with `next/dynamic` (`ssr: false`).

## Components and hooks **[Docs]**
- `<Vivari files run install boot onServerReady onOutput onError fallback renderError .../>`: boots, mounts `files`, runs install then run, renders the dev-server preview in an iframe. `install` defaults to `["npm","install"]`; pass `false` to skip.
- `<VivariProvider>`: share one instance between your own panels and `<Vivari>`.
- `useVivari(options?)`: `{ status, vivari, error, boot, restart }`; status is `"idle" | "booting" | "ready" | "error" | "unsupported"`. `autoBoot: false` defers boot until `boot()`. Instances are shared by `instanceKey`.
- `<VivariPreview port path reloadKey />`: the preview iframe alone (for custom layout).
- `useSpawn(command, args?, options?)`: run processes (`run, kill, write, status, output`). Use `onOutput` for terminal output; `collect: true` only for small outputs.
- `useVivariFile(path, { debounce })`: a VFS file as React state with debounced write-behind into the **VM filesystem** (not the database). `save()` flushes immediately. Text only.
- `useVivariDir(path)`: live directory listing (non-recursive; use one hook per expanded folder).
- Failures: `onError({ phase, error })` with phase `"unsupported" | "boot" | "mount" | "install" | "run"`. `fallback` is only for pending states; use `renderError` for failures. `"unsupported"` carries a `reason`: `"not-cross-origin-isolated"` or `"no-web-workers"`.

`files` shape (WebContainer-style tree) **[Docs for files; Verify directories in Core API]**:
```ts
const files = {
  'package.json': { file: { contents: '...' } },
  src: { directory: { 'App.jsx': { file: { contents: '...' } } } },  // verify the "directory" key
}
```

## Cross-origin isolation (mandatory) **[Docs]**
Every HTML document that boots Vivari, and `sw.js`, must be served with:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
Consequences:
- Under `require-corp`, every cross-origin subresource (images, fonts, analytics, embeds) fails unless it sends CORP/CORS. **Self-host fonts** (`next/font`), avoid remote images/scripts on playground routes.
- Nested iframe documents must send the policy themselves.
- Isolation is "contagious": scope the headers to the routes that host Vivari (`/` if the landing page hosts the editor, and `/p/*`). Keep `/admin` and `/api` outside.
- Next.js: set in `next.config` `headers()` with route-scoped `source`. **[Docs]**
```js
async headers() {
  const iso = [
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  ]
  return [
    { source: '/', headers: iso },
    { source: '/p/:path*', headers: iso },
    { source: '/sw.js', headers: [...iso, { key: 'Service-Worker-Allowed', value: '/' }] },
  ]
}
```
- Check at runtime with `isCrossOriginIsolated()` and render a clear "headers missing" state.

## Preview Service Worker **[Docs]**
Copy `node_modules/@vivari/core/dist/assets/sw.js` to `public/sw.js` (add a `postinstall`/prebuild copy script so it never goes stale vs the installed version). Serve it with `Service-Worker-Allowed: /` plus the isolation headers. If hosted elsewhere, pass `serviceWorkerUrl` in boot options.

## npm/pnpm inside the VM **[Docs]**
Running a package manager in the VM makes Vivari fetch vendored tarballs from `/vendor/...` on **your origin**. Either host that directory or skip installs (`install={false}`) and design starter templates that run without installing. Decide this early; it affects the default templates (plain HTML/CSS/JS needs no install; React/Next templates do).

## Playground design guidance (this project)
- Practical is the **default tab**; boot lazily if the panel is below the fold (`autoBoot: false` + `boot()` on demand) to avoid costing a kernel for visitors who never use it.
- **No autosave:** edits live in the VM/React state only. On Save, read the file tree out of the VM (via `vivari.fs` from the Core API; recursively `readdir` + `readFile`, text only) and send it with the single save request. **[Verify exact fs method names in Core API]**
- Skip `node_modules`, build output and binary files when serializing `files`. Add a size cap and show an error if exceeded (D1 row/size limits apply).
- Default starter templates (HTML/CSS/JS, React, Next-like) are defined as `files` trees in code; anonymous and new playgrounds start from them.
- Non-owners can edit locally but never persist; the Save button becomes Fork.
- Build the three panels from the hooks: file tree (`useVivariDir`), editor (`useVivariFile` or Monaco/CodeMirror bound to it), preview (`<VivariPreview>`). Choose a lightweight editor (CodeMirror 6 is lighter than Monaco; lazy-load whichever is used). Check that its workers/assets load same-origin under COEP.
