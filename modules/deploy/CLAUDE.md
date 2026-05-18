# Deploy module — instructions for Claude

When the user asks to **set up codejitsu/core/deploy** (or "wire up the Cloudflare deploy", "add the daily deploy"), do the following.

## What this module provides

- `templates/wrangler.toml` — minimal Cloudflare Pages config.
- `templates/daily-deploy.yml` — GitHub Action that pings a Cloudflare deploy hook every morning so scheduled blog posts (or any time-gated content) graduate from hidden to public on their publish date.

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

### 4. Verify

- Trigger the workflow manually: `gh workflow run "Daily Deploy"` (or via the GH UI).
- A Cloudflare Pages deployment should kick off within seconds.

## Build command (for Cloudflare Pages git integration)

If using Cloudflare's git integration (preferred for push-driven deploys):
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`
- **Node version:** 20 (set via `NODE_VERSION=20` env var in Pages settings)

## What must NOT be done

- **Don't commit the deploy hook URL.** It belongs in `CLOUDFLARE_DEPLOY_HOOK_URL` secret only.
- **Don't change the cron without reason.** 13:00 UTC is intentional — early-morning Pacific so posts are live by the time users wake up. If a site is on a different timezone, change it explicitly and note why in a comment in the workflow file.
- **Don't add a `wrangler deploy` step to the cron workflow.** The workflow only *pings* the deploy hook; Cloudflare does the actual build via git integration. Doing the build twice causes drift.
- **Don't skip the daily-deploy workflow even if the site has no scheduled content yet.** It's the safety net for when the user adds a scheduled post six months later.

## Verify

- [ ] `wrangler.toml` present at site root with correct `name`.
- [ ] `.github/workflows/daily-deploy.yml` present.
- [ ] `CLOUDFLARE_DEPLOY_HOOK_URL` secret set in the repo (check with `gh secret list`).
- [ ] Cloudflare Pages project exists and is connected to the git repo.
