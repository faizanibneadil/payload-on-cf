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
`scripts/check-env.mjs` holds the required list (`requiredEnvs`) and exits non-zero with every missing name. Today it requires `PAYLOAD_SECRET`, plus `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` when `CI` is set. The workflow runs it right after install.

## Single source of truth for envs
There is no separate `env.manifest`. The list in `scripts/check-env.mjs`, `.env.example`, the workflow `env:` block and `wrangler.jsonc` `vars` must match each other.

### How to add a new env later (also in the README)
1. Add the name to `scripts/check-env.mjs` (if required) and `.env.example`.
2. Add the GitHub secret/variable in repo settings.
3. Map it in the workflow `env:` (and push it to the Worker in the secrets step if it is a runtime secret).
4. If non-secret runtime, add to `wrangler.jsonc` `vars`.
5. Read it in code through the supported runtime path.

## Secrets the owner must create in GitHub
| Name | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Deploy + D1 migrations (permissions: Workers edit, D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Identify the account |
| `PAYLOAD_SECRET` | Payload signing secret (runtime + needed by CI where config loads) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Optional, default admin created by `pnpm deploy:seed` when none exists |
| `SMTP_*` | Optional email transport (the startup email in `onInit` is commented out) |
| any further runtime secret the code reads | pushed to the Worker by the workflow |

The agent must list the final, exact set in the README and the final summary. Never print secrets in logs.

## Why GitHub Actions and not Cloudflare Workers Builds (decided October 2026)
- The repo is **public**. GitHub-hosted standard runners are free and have no minute limit for public repositories (free plan: up to 20 concurrent jobs). One deploy run takes about 4 minutes.
- If the repo ever becomes private, the free plan gives 2,000 minutes per month (about 500 runs of 4 minutes). Check the usage under GitHub Settings > Billing then, and only then consider Cloudflare Workers Builds (connects the repo in the Cloudflare dashboard, builds on push per branch, has its own monthly build-minute quota).
- Saving runs: pushes that change only `docs/**` or `*.md` do not trigger a deploy (`paths-ignore`). A running deploy is never cancelled (`cancel-in-progress: false`) so a D1 migration is never cut in half; newer pushes wait and only the latest queued run is kept.
- A deploy is live only when the run is green. Every iteration is verified on the dev URL after its push.
