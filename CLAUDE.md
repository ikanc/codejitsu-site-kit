# Master instructions — @ibalzam/codejitsu-core

Shared core for every Codejitsu site. When the user invokes a module by name (e.g. **"implement codejitsu/core/blog"**), this file is your starting point.

## How to act on a module request

1. **Always start with the unified config.** Open `codejitsu.config.ts` at the site root. If it doesn't exist yet, create one — see `modules/config/CLAUDE.md`.
2. Open `node_modules/@ibalzam/codejitsu-core/modules/<name>/CLAUDE.md` for that module's specific wiring instructions.
3. Import code from the matching subpath (e.g. `@ibalzam/codejitsu-core/blog`). Do **not** copy-paste source into the site.
4. If the module has a `templates/` directory, copy those files into the site at the locations the module's CLAUDE.md specifies. Adapt templates for the site's brand and content.
5. After the change, walk through the module's `checklist.md` plus `checklist/core.md` (sitewide). Run `npx codejitsu-check` from the site root.

## Module subpaths

| Subpath | Provides |
|---|---|
| `@ibalzam/codejitsu-core/config` | `defineConfig()`, `loadConfig()`, all types |
| `@ibalzam/codejitsu-core/blog` | `createBlog()` (fs+gray-matter), `createBlogFromCollection()` (Astro CC) |
| `@ibalzam/codejitsu-core/seo` | Schema builders, sitemap helpers, `jsonLd()` |
| `@ibalzam/codejitsu-core/seo/schema` | Schema builders only |
| `@ibalzam/codejitsu-core/seo/sitemap` | Sitemap helpers only |
| `@ibalzam/codejitsu-core/images` | `optimizeImages()`, `autoBlogImages()` (mostly used via CLI) |
| `@ibalzam/codejitsu-core/llms` | `generateLlms()` (mostly used via CLI) |

CLIs (auto-discover `codejitsu.config.ts`):
- `codejitsu-optimize-images`
- `codejitsu-llms`
- `codejitsu-check`

## Always use latest stable versions

When scaffolding a new project, adding a dependency, or upgrading an existing one — **do not rely on package versions from training data**. They will be wrong. Always check the npm registry first.

### Required checks before suggesting any version

- For a single package: `npm view <pkg> version` returns the actual current latest.
- For the whole project: `npx codejitsu doctor` runs `npm outdated` and flags drift, with extra emphasis on the critical stack (Astro, React, Tailwind, TypeScript, codejitsu-core, the astro integrations).
- For Node: `node --version` — current LTS major is what new projects should target.

### When starting a new Codejitsu site

Run `codejitsu doctor` immediately after `npm install` and before writing real code. If anything critical is behind, upgrade first. **Never start a new project on an outdated framework.**

### When upgrading an existing site

- Patch / minor bumps: `npm update` and re-run `codejitsu doctor` + `codejitsu audit`.
- Major bumps (e.g. Astro N → N+1, TypeScript N → N+1): read the framework's migration guide, plan separately. Don't bundle into other work.

### When the user asks "what version of X should we use"

Run `npm view X version` and report the actual latest. Then offer pros/cons of any pinning concerns (peer-dep conflicts, etc.). Do NOT say a number from memory.

## Principles that apply to every Codejitsu site

Non-negotiable unless the user explicitly opts out.

### Stack
- **Astro** (latest stable). Pure static (`output: 'static'`).
- **Tailwind v4** via `@tailwindcss/vite`. Theme via CSS variables, not hardcoded palettes.
- **TypeScript** everywhere except where Astro/Vite expects `.mjs`.
- **React** integration only if the site needs client islands (Framer, charts). Otherwise pure Astro.
- **Astro Content Collections** for blog (use `createBlogFromCollection`). The fs loader is for non-Astro projects.

### Deploy
- **Cloudflare Pages**, static deploy. `wrangler.toml` at site root.
- Daily GH Action pings the Cloudflare deploy hook to publish scheduled content.

### URLs + routing
- `trailingSlash: 'always'`. Internal links end with `/`.
- Canonical URLs absolute, trailing-slashed.

### Images
- Source images for general assets in `public/...`; auto-converted to WebP via `codejitsu-optimize-images` in `prebuild`.
- Blog source images live OUTSIDE `public/` (e.g. `private/blog-source-images/`), named `<slug>.{png,jpg,jpeg,webp}`. The CLI optimizes them to `public/assets/images/blog/<slug>.webp` via `autoBlogImages`.
- Astro `<Image>` auto-converts components-loaded images. Use it for hero / inline imagery imported from `src/assets/`.
- No raw PNG/JPG references in production HTML where a `.webp` sibling exists.

### SEO (every page)
- `<title>`, meta description, canonical, OG, Twitter, JSON-LD via `<SiteHead />` (site wrapper around `@ibalzam/codejitsu-core/seo/Head.astro`).
- Schemas from `@ibalzam/codejitsu-core/seo` builders. Inject with `jsonLd()` (never raw `JSON.stringify`).
- `sitemap.xml` generated via `@astrojs/sitemap` + `defaultPriorityRules()` + `excludeFuturePosts()`.
- `robots.txt` at site root.
- `/llms.txt` + `/llms-full.txt` generated via `codejitsu-llms` in prebuild.

### Content
- Blog posts as `.md` in `src/content/blog/` with frontmatter validated by an Astro CC schema.
- Future-dated posts hidden from public pages and sitemap; pages built for OG scrapers.
- `draft: true` posts excluded everywhere.

### What NOT to do
- Don't reinvent modules. Always import or copy from this package.
- Don't hardcode brand colors in component files — use Tailwind theme tokens / CSS variables.
- Don't add server-rendered routes or anything that breaks static export.
- Don't write to `dist/` directly. All artifacts flow from `prebuild` + `astro build`.
- Don't keep old per-module config files (`codejitsu-images.config.mjs`, `codejitsu-llms.config.mjs`). Only `codejitsu.config.ts` is read in v0.2.0+.

## After any non-trivial change

`npx codejitsu-check` and walk `checklist/core.md`. For UI: build, open in browser, verify visually.

## Upgrading `@ibalzam/codejitsu-core`

1. `npm update @ibalzam/codejitsu-core`
2. Read every `MIGRATIONS/<version>.md` between the old installed version and the new one.
3. Apply migration steps in order. They're prose — judgment is fine; ask the user when ambiguous.
4. Run `codejitsu-check` to verify.
