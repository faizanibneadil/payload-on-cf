# 07. GitHub Actions: env + secrets to Cloudflare

Docs:
- wrangler-action: https://github.com/cloudflare/wrangler-action
- Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Worker variables: https://developers.cloudflare.com/workers/configuration/environment-variables/
- GitHub secrets: https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions

## The core problem
GitHub secrets exist only while the workflow runs. The deployed Worker does not receive them. Anything the app needs **at runtime** must be pushed to Cloudflare during deploy. Anything needed **at build time** (`NEXT_PUBLIC_*`, values read during `next build`) must be in the build step's `env`.

| Kind | Where it must exist | How |
|---|---|---|
| Build-time (`NEXT_PUBLIC_*`) | build step env | `env:` on the build step |
| Runtime secret (e.g. `PAYLOAD_SECRET`) | Cloudflare Worker secret | wrangler-action `secrets:` input or `wrangler secret bulk` |
| Runtime non-secret | Worker `vars` | `wrangler.jsonc` `vars` (committed) |
| CI auth | workflow only | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |

## wrangler-action pattern **[Docs]**
```yaml
- name: Deploy
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    secrets: |
      PAYLOAD_SECRET
      OTHER_RUNTIME_SECRET
  env:
    PAYLOAD_SECRET: ${{ secrets.PAYLOAD_SECRET }}
    OTHER_RUNTIME_SECRET: ${{ secrets.OTHER_RUNTIME_SECRET }}
```
Each name listed under `secrets:` must also be provided under `env:` with the same name; the action uploads them to the Worker as secrets.

**Ordering [Verify]:** secrets must exist before the new version serves traffic, and a Worker may need to exist before secrets can be set (first-ever deploy edge case). Read the wrangler-action docs and handle the first deploy explicitly; never leave a deploy where code ships without its secrets.

## Typical job order
1. checkout, setup pnpm + Node, install (frozen lockfile)
2. **env check** (fail fast)
3. typecheck + lint
4. build (with build-time env)
5. apply D1 migrations to remote
6. deploy to Cloudflare + sync runtime secrets

## Fail-fast env check
A small script (`scripts/check-env.mjs`) reads the required list and exits non-zero with every missing name:
```js
const required = (await import('node:fs')).readFileSync('env.manifest', 'utf8')
  .split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))
const missing = required.filter(k => !process.env[k])
if (missing.length) { console.error('Missing env:', missing.join(', ')); process.exit(1) }
```
Run it in the workflow with the needed values mapped from `secrets.*` / `vars.*`.

## Single source of truth for envs
Keep one `env.manifest` (names only, each tagged build/runtime/secret). The check script, `.env.example`, the workflow `env:`/`secrets:` blocks and `wrangler.jsonc` `vars` must all match it.

### How to add a new env later (put this in the README)
1. Add the name to `env.manifest` and `.env.example`.
2. Add the GitHub secret/variable in repo settings.
3. Map it in the workflow `env:` (and under `secrets:` if runtime-secret).
4. If non-secret runtime, add to `wrangler.jsonc` `vars`.
5. Read it in code through the supported runtime path.

## Secrets the owner must create in GitHub
| Name | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Deploy + D1 migrations (permissions: Workers edit, D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Identify the account |
| `PAYLOAD_SECRET` | Payload signing secret (runtime + needed by CI where config loads) |
| any further runtime secret the code reads | pushed to the Worker by the workflow |

The agent must list the final, exact set in the README and the final summary. Never print secrets in logs.
