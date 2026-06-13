# Deploy module — checklist

- [ ] `wrangler.toml` exists at site root with the correct Cloudflare Pages project `name`.
- [ ] `pages_build_output_dir = "dist"` in `wrangler.toml`.
- [ ] `.github/workflows/daily-deploy.yml` exists and is unmodified from the template (or modifications are documented in a comment).
- [ ] Deploy-hook secret is set in the repo (`gh secret list`): `CLOUDFLARE_DEPLOY_HOOK_URL` (single site) or `CLOUDFLARE_DEPLOY_HOOK_URLS` (multi-site monorepo, one URL per line).
- [ ] A Cloudflare Pages project exists for **each** site and is connected to the GitHub repo (git integration); every project's hook is in the secret.
- [ ] Each Pages project's build command is `npm run build` (for its own site/workspace), output dir is `dist`, Node version is 20.
- [ ] Manual run of `gh workflow run "Daily Deploy"` triggers a Cloudflare deployment in **every** Pages project within seconds.
