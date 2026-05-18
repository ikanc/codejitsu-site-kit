# Master instructions — @ibalzam/codejitsu-core

This is the shared core for all Codejitsu sites. When a Codejitsu site depends on this package and the user invokes a module by name (e.g. **"implement codejitsu/core/blog"**, **"add codejitsu/core/seo"**), this file is your starting point.

## How to act on a module request

1. Open `node_modules/@ibalzam/codejitsu-core/modules/<name>/CLAUDE.md` — it tells you what to do for that module specifically.
2. Import code from the matching subpath (e.g. `@ibalzam/codejitsu-core/blog`). Do **not** copy-paste the source into the site.
3. If the module has a `templates/` directory, copy those files into the site at the locations the module's CLAUDE.md specifies. Templates are starting points — adapt them for the site's content.
4. After the change, run the module's `checklist.md` mentally, plus `checklist/core.md` (sitewide).

## Principles that apply to every Codejitsu site

These are non-negotiable unless the user explicitly opts out:

### Stack
- **Astro** (latest stable). Pure static output (`output: 'static'`).
- **Tailwind v4** via `@tailwindcss/vite`. Theme via CSS variables on `:root`, not hardcoded color palettes.
- **TypeScript** everywhere except config files where Astro/Vite expects `.mjs`.
- **React** integration only if the site needs interactive client islands (Framer, charts). Otherwise pure Astro.

### Deploy
- **Cloudflare Pages**, static deploy. `wrangler.toml` at site root.
- `npm run build && npx wrangler pages deploy dist` is the deploy command (or git-integration on Pages).
- Daily GH Action (`.github/workflows/daily-deploy.yml`) pings a Cloudflare deploy hook to publish scheduled content. See `modules/deploy/`.

### URLs + routing
- `trailingSlash: 'always'` in Astro config. Every internal link ends with `/`.
- Canonical URLs are absolute and trailing-slashed.

### Images
- Source images in `public/images/` (or `src/assets/` for Astro-processed). Originals can be PNG/JPG.
- Every shipped image must be available as WebP. The Astro sharp service handles `<Image>` references automatically (`image.defaults: { quality: 82, format: 'webp' }`). For images referenced by URL in HTML/CSS, run the pre-pass: `npx codejitsu-optimize-images`.
- No raw PNGs referenced from production HTML when a WebP equivalent exists.

### SEO (must be on every page)
- `<title>` and `<meta name="description">` set per page.
- Canonical URL `<link rel="canonical">`.
- OG meta (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`).
- Twitter card meta.
- JSON-LD schema.org appropriate to the page type (Organization on home, LocalBusiness if applicable, BlogPosting on blog posts, FAQPage if FAQs present). Use builders from `@ibalzam/codejitsu-core/seo/schema`.
- `sitemap.xml` generated via `@astrojs/sitemap` with helpers from `@ibalzam/codejitsu-core/seo/sitemap`.
- `robots.txt` at site root.
- `/llms.txt` + `/llms-full.txt` generated via `npx codejitsu-llms` in prebuild.

### Content
- Blog posts as Markdown in `content/blog/` with frontmatter (see `modules/blog/CLAUDE.md`).
- Future-dated posts are hidden from public pages and sitemap but kept addressable for OG meta scrapers.
- All copy in English unless the site uses the i18n module (workzen-only currently).

### What NOT to do
- Don't reinvent modules that exist here. If you're tempted to write a blog loader, image optimizer, sitemap config, schema builder, or daily-deploy workflow, **import or copy from this package instead**.
- Don't hardcode brand colors in component files — always via Tailwind theme tokens / CSS variables.
- Don't add a runtime database, server-rendered routes, or anything that breaks static export. These sites deploy as plain HTML.
- Don't add page-level redirects in code; use Cloudflare Pages `_redirects` or `_headers`.
- Don't introduce a new heavy dependency without checking if existing modules already cover it.

## After any non-trivial change

Run through `checklist/core.md` before reporting work as done. For UI changes, build the site and view the pages in a browser — type-checking is not visual verification.

## Updating to a new version of `@ibalzam/codejitsu-core`

1. `npm update @ibalzam/codejitsu-core`
2. Read `node_modules/@ibalzam/codejitsu-core/MIGRATIONS/` for any version notes newer than the previous installed version.
3. Apply migration steps in order. They're prose, not codemods — judgment is fine; ask the user when ambiguous.
4. Run `checklist/core.md` to verify nothing regressed.
