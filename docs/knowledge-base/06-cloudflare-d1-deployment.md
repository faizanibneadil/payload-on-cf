# 06. Cloudflare Workers + D1 + Payload

Sources:
- Official template: https://github.com/payloadcms/payload/tree/main/templates/with-cloudflare-d1
- Payload on Workers (Cloudflare blog): https://blog.cloudflare.com/payload-cms-workers/
- OpenNext Cloudflare: https://opennext.js.org/cloudflare
- D1: https://developers.cloudflare.com/d1/ , Wrangler: https://developers.cloudflare.com/workers/wrangler/

## Stack facts
- Payload uses a D1 adapter (`@payloadcms/db-d1-sqlite`, adapter `sqliteD1Adapter({ binding })`). **[Verify package/adapter names in the template's package.json]**
- The Worker accesses D1 via a **binding** (name set in `wrangler.jsonc`, `D1` in the template). There is no connection string. **[Docs]**
- Next.js runs on Workers through the OpenNext adapter (`@opennextjs/cloudflare`). Bindings are read with `getCloudflareContext()`. **[Docs]**
- The template notes a recommended **Paid Workers plan** because of the 3 MB bundle limit on the free plan. Keep the server bundle small: lazy-load heavy client libs, avoid server-side imports of big packages. **[Docs]**
- Workers runtime: no general Node filesystem access. Avoid `fs`, native modules, `sharp`-style deps in server code unless the template handles them.

## Copy patterns from the official template
Use the template as the source of truth for: `payload.config.ts` (D1 adapter + Cloudflare context handling for CLI commands), `wrangler.jsonc`, `open-next.config.ts`, and package scripts. The scripts it ships (names may differ in your repo, check yours first):
```
deploy          = deploy:database && deploy:app
deploy:database = NODE_ENV=production PAYLOAD_SECRET=ignore payload migrate && wrangler d1 execute D1 --command 'PRAGMA optimize' --remote
deploy:app      = opennextjs-cloudflare build && opennextjs-cloudflare deploy
```
(`CLOUDFLARE_ENV` is used there for named wrangler environments.) **[Docs]**

## Migrations (D1 has no auto-push in production)
- Create after any schema change: `pnpm payload migrate:create`
- Commit the generated migration files.
- Production applies them with `payload migrate` (as in `deploy:database`).
- Always target the **remote** D1 in CI (`--remote` for wrangler commands). A known pitfall: a migration "succeeds" locally but the remote DB stays empty because the local binding was used. **[Verify in CI logs]**

## Local development
- `.dev.vars` holds local secrets for Wrangler/OpenNext (gitignored). `.env` is for Next/Payload tooling. Keep `.env.example` complete.
- `wrangler login` for local Cloudflare auth.

## Runtime env access
- Bindings (D1): via Cloudflare context, not `process.env`.
- Vars/secrets: OpenNext exposes Worker vars/secrets to server code (including `process.env` with the `nodejs_compat` flag in the template config). **[Verify with the installed OpenNext version]**
- `NEXT_PUBLIC_*` are inlined at **build time**; setting them only on the Worker at runtime does nothing for client bundles.

## Pitfalls
- Missing secret at runtime = app fails after a "successful" deploy. See file 07.
- COOP/COEP headers (needed by Vivari) must come from Next (`next.config` `headers()` or middleware). `public/_headers` only affects static assets on Workers, not dynamic responses. **[Verify on your deployment]**
- Scope isolation headers to the playground routes. Do not put `Cross-Origin-Embedder-Policy: require-corp` on `/admin` or `/api` (it can break admin assets and third-party resources).
