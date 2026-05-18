# llms.txt module — checklist

- [ ] `codejitsu-llms.config.mjs` exists at site root.
- [ ] `siteUrl`, `siteName`, `about` are set (no placeholders).
- [ ] `prebuild` script in `package.json` invokes `codejitsu-llms`.
- [ ] `public/llms.txt` and `public/llms-full.txt` exist after build.
- [ ] `llms.txt` is < 50KB; `llms-full.txt` is < 500KB.
- [ ] Both files are served with `Content-Type: text/plain` (verify in browser DevTools → Network).
- [ ] `llms.txt` is linked from `robots.txt` (optional but recommended): add `LLMs: https://site.com/llms.txt` line.
- [ ] If site has a blog: `blogDir` is set and recent posts appear in the output.
