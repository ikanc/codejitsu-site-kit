# llms.txt module — checklist

- [ ] `codejitsu.config.ts` has an `llms` section.
- [ ] `site.url`, `site.name`, `llms.about` are set (no placeholders).
- [ ] `prebuild` script in `package.json` invokes `codejitsu-llms` (after `codejitsu-optimize-images`).
- [ ] `public/llms.txt` and `public/llms-full.txt` exist after build.
- [ ] `llms.txt` is < 50KB; `llms-full.txt` is < 500KB.
- [ ] Both files served as `Content-Type: text/plain` (verify in DevTools → Network).
- [ ] If site has a blog: `llms.blogDir` is set, recent posts appear in the output.
- [ ] If `content-scan` mode: services and locations dirs exist, and rendered output includes them.
- [ ] `aiGuidance` block answers: who we are, who we serve, key differentiator, how to contact / sign up.
