# Deploy module — checklist

- [ ] `wrangler.toml` exists at site root with the correct Cloudflare Pages project `name`.
- [ ] `pages_build_output_dir = "dist"` in `wrangler.toml`.
- [ ] `.github/workflows/daily-deploy.yml` exists and is unmodified from the template (or modifications are documented in a comment).
- [ ] `CLOUDFLARE_DEPLOY_HOOK_URL` secret is set in the repo (`gh secret list`).
- [ ] Cloudflare Pages project exists and is connected to the GitHub repo (git integration).
- [ ] Pages build command is `npm run build`, output dir is `dist`, Node version is 20.
- [ ] Manual run of `gh workflow run "Daily Deploy"` triggers a Cloudflare deployment within seconds.
