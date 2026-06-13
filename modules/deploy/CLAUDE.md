# Deploy module — instructions for Claude

When the user asks to **set up codejitsu/core/deploy** (or "wire up the Cloudflare deploy", "add the daily deploy"), do the following.

## What this module provides

- `templates/wrangler.toml` — minimal Cloudflare Pages config.
- `templates/daily-deploy.yml` — GitHub Action that pings one or more Cloudflare deploy hooks every morning so scheduled blog posts (or any time-gated content) graduate from hidden to public on their publish date. Handles both single-site repos and multi-site monorepos (see below).

## Wiring it into a site

### 1. Copy templates

- `templates/wrangler.toml` → `wrangler.toml` at site root. Edit the `name` field to match the Cloudflare Pages project name.
- `templates/daily-deploy.yml` → `.github/workflows/daily-deploy.yml`. No edits needed (cron is set for 13:00 UTC = 06:00 PDT / 05:00 PST).

### 2. Create the Cloudflare deploy hook

Tell the user to do this manually (Claude can't):

1. Open the Cloudflare dashboard → Pages → the site's project → **Settings → Builds & deployments → Deploy hooks**.
2. Create a new hook (any name, e.g. `daily-scheduled-content`). Branch: `main`.
3. Copy the generated URL.

### 3. Set the GH secret

```bash
gh secret set CLOUDFLARE_DEPLOY_HOOK_URL --body "<paste URL>"
```

Or via the GitHub UI: Settings → Secrets and variables → Actions → New repository secret, named `CLOUDFLARE_DEPLOY_HOOK_URL`.

> Multi-site monorepo? Skip this step and follow **Multi-site monorepos** below instead.

### 4. Verify

- Trigger the workflow manually: `gh workflow run "Daily Deploy"` (or via the GH UI).
- A Cloudflare Pages deployment should kick off within seconds.

## Multi-site monorepos

A single repo can host several sites (e.g. `sites/www`, `sites/kamloops`, `sites/kelowna`), each deployed as its **own Cloudflare Pages project**. There is still only **one** `.github/workflows/daily-deploy.yml` for the repo, but it must rebuild **every** project — otherwise only one site graduates its scheduled content each morning and the rest stay stale.

The template already handles this. To wire it up:

1. **Create one deploy hook per Pages project** (Cloudflare dashboard → each project → Settings → Builds & deployments → Deploy hooks, branch `main`). For garagedoorpros that's three: `garagedoorpros-ca`, `gdp-kamloops`, `gdp-kelowna`.
2. **Store all the URLs in a single plural secret, comma-separated** (one line — easiest to set and paste; Cloudflare hook URLs never contain commas):

   ```bash
   gh secret set CLOUDFLARE_DEPLOY_HOOK_URLS \
     --body "https://api.cloudflare.com/.../www-hook,https://api.cloudflare.com/.../kamloops-hook,https://api.cloudflare.com/.../kelowna-hook"
   ```

   (Newline- or space-separated values also work — the workflow splits on commas, newlines, and spaces — but commas keep it a single line, which avoids the multi-line `--body` / paste pitfalls.)
3. The workflow prefers `CLOUDFLARE_DEPLOY_HOOK_URLS` when present, splits it, and pings each URL. It only falls back to the singular `CLOUDFLARE_DEPLOY_HOOK_URL` when the plural secret is absent — so single-site repos need no change.

**Adding a site later:** create its deploy hook, append `,<new-url>` to `CLOUDFLARE_DEPLOY_HOOK_URLS`, done. No workflow edit needed.

**Verify:** `gh workflow run "Daily Deploy"` then confirm a deployment kicks off in *every* Pages project, not just one.

## Build command (for Cloudflare Pages git integration)

If using Cloudflare's git integration (preferred for push-driven deploys):
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`
- **Node version:** 20 (set via `NODE_VERSION=20` env var in Pages settings)

## What must NOT be done

- **Don't commit the deploy hook URL(s).** They belong in the `CLOUDFLARE_DEPLOY_HOOK_URL` / `CLOUDFLARE_DEPLOY_HOOK_URLS` secret only.
- **Don't add a second daily-deploy workflow for a monorepo's extra sites.** One workflow pings all hooks via `CLOUDFLARE_DEPLOY_HOOK_URLS` — see **Multi-site monorepos**. Duplicate workflows mean duplicate crons and drift.
- **Don't change the cron without reason.** 13:00 UTC is intentional — early-morning Pacific so posts are live by the time users wake up. If a site is on a different timezone, change it explicitly and note why in a comment in the workflow file.
- **Don't add a `wrangler deploy` step to the cron workflow.** The workflow only *pings* the deploy hook; Cloudflare does the actual build via git integration. Doing the build twice causes drift.
- **Don't skip the daily-deploy workflow even if the site has no scheduled content yet.** It's the safety net for when the user adds a scheduled post six months later.

## Verify

- [ ] `wrangler.toml` present at site root with correct `name`.
- [ ] `.github/workflows/daily-deploy.yml` present.
- [ ] Deploy-hook secret set (check with `gh secret list`): `CLOUDFLARE_DEPLOY_HOOK_URL` for a single site, or `CLOUDFLARE_DEPLOY_HOOK_URLS` (one URL per line) for a multi-site monorepo.
- [ ] A Cloudflare Pages project exists for **each** site and is connected to the git repo, and every project has a hook in the secret.
