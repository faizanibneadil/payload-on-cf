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
- The repo is **public**. GitHub-hosted standard runners are free and have no minute limit for public repositories (free plan: up to 20 concurrent jobs). One run takes about 8 minutes with the tests (measured, see below); the 4 test shards run in parallel, which the free plan allows (up to 20 concurrent jobs).
- If the repo ever becomes private, the free plan gives 2,000 minutes per month (about 500 runs of 4 minutes). Check the usage under GitHub Settings > Billing then, and only then consider Cloudflare Workers Builds (connects the repo in the Cloudflare dashboard, builds on push per branch, has its own monthly build-minute quota).
- Saving runs: pushes that change only `docs/**` or `*.md` do not trigger a deploy (`paths-ignore`). A running deploy is never cancelled (`cancel-in-progress: false`) so a D1 migration is never cut in half; newer pushes wait and only the latest queued run is kept.
- A deploy is live only when the run is green. Every iteration is verified on the dev URL after its push.

## Tests before every deploy (owner, October 2026, task CI1)
The whole suite runs in GitHub Actions on every push to `dev` (the owner merging a PR) and `main`, before the deploy. Locally only the tests of the changed modules run (`12`, rule 3).
- `checks`: `pnpm test:int`, `pnpm lint`, `pnpm exec tsc --noEmit`.
- `e2e-build`: the production Worker build for the browser tests (`tests/e2e/server.sh build`), uploaded as the artifact `e2e-worker-build` (1 day).
- `e2e` (needs `e2e-build`): the browser suite in 4 parallel shards (`playwright test --shard=N/4`, each spec file gets a fresh local D1 on the runner, the runner's preinstalled Google Chrome via `CHROMIUM_PATH`, nothing is downloaded (owner: installing a browser on every run is slow; `ubuntu-latest` = Ubuntu 24.04 ships Google Chrome and Chromium, see the runner-images list); the step stops the job if no Chrome/Chromium is found). Only Playwright's small `ffmpeg` is installed (`playwright install ffmpeg`, no browser): the tests record a video of every browser window for failure reports, and Chrome does not ship it (the first CI run failed on this, `Executable doesn't exist at ~/.cache/ms-playwright/ffmpeg-1011`). `fail-fast: false`, so every shard reports. On a failure the shard uploads `e2e-report-shard-N` (HTML report, screenshots, videos, traces, server logs; 7 days).
- On a failed shard the step `Show test server logs` prints, for every test server the shard started (one per spec file), its last 60 lines (`bash tests/e2e/server.sh logs`, `LINES=` to change), so the reason a server stopped can be read in the job log (GitHub MCP `get_job_logs`) without downloading the artifact (blocked from the cloud session) (task CI2).
- `deploy` (needs `checks` and `e2e`): unchanged otherwise (env check, schema drift check, migrations, seed, secrets, build + deploy, smoke test).
- The test jobs get **no Cloudflare secrets**: the test server can only use the runner's local D1, never the dev or production database.
- Time (measured, first green run 40121379991, 24 Oct 2026): merge to deploy about 8 minutes (was about 4 without tests). `checks` 0:37, `e2e-build` 1:37, the 4 shards 2:20-3:24 in parallel, `deploy` 2:58.
- The live-check workflow removed in task A2 stays removed.

Deploy speed: `.next/cache` is cached between runs (`actions/cache`), so the Next.js build only recompiles changed files.
