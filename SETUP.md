# Codejitsu Setup — Claude playbook

End-to-end procedure for adding `@ibalzam/codejitsu-core` to any project.
Works for both **greenfield** (brand new site) and **migration** (existing
Astro site with its own scaffolding).

> **For Claude**: This file is the cookbook. When the user says any of:
> "set up codejitsu", "add codejitsu", "init codejitsu", "migrate <site> to
> codejitsu", "start a new Codejitsu site" — open this file and follow the
> steps top-down. Don't improvise from training-data memory.

---

## Pre-flight: never trust version memory

Before any step that mentions a package version:

```bash
npm view @ibalzam/codejitsu-core version    # what's actually latest right now
node --version                               # must be ≥ 20 LTS
```

Use `@latest` in install commands rather than typing a version number you
think is current. If the project already has the package, run:

```bash
npx codejitsu doctor
```

Surface anything outdated to the user **before** doing setup. Fixing drift
on a stale codebase is worse than starting from current.

---

## Step 1 — Detect current state

Don't ask the user what's there. Look:

```bash
cat package.json | head -40            # what's installed + scripts
cat astro.config.mjs                    # framework + integrations
ls src/content.config.ts 2>/dev/null && cat src/content.config.ts
ls src/content/ 2>/dev/null             # collections present?
ls src/pages/                           # route shape
cat .git/config | grep url              # github remote
cat wrangler.toml 2>/dev/null           # cloudflare project name
ls codejitsu.config.ts codejitsu.config.mjs 2>/dev/null  # already set up?
```

Build a one-screen summary for the user:

```
Detected:
  Astro:        6.3.5
  Has blog:     Yes (Content Collections, dateField: pubDate, draftField: draft)
  Has services: Yes (src/content/services/, 9 .md files)
  Has locations: Yes (src/content/locations/, 7 .md files)
  GitHub:       ikanc/example
  Cloudflare:   wrangler.toml present, project: example
  Codejitsu:    Not installed yet

Greenfield or migration: MIGRATION
```

State this back to the user **before making changes**. Ask one question:

> "Above is what I detected — anything missing or wrong before I proceed?"

If they say "go" → continue. If they correct something → update your model.

---

## Step 2 — Install the package

```bash
npm install @ibalzam/codejitsu-core@latest
npm install -D jiti        # only if codejitsu.config.ts (TS) will be used
```

Then immediately:

```bash
npx codejitsu doctor
```

Confirm:
- `✓ @ibalzam/codejitsu-core ✓ On latest`
- No critical outdated deps (Astro / TypeScript / React / Tailwind etc.)

If critical deps are outdated, **stop and surface to user**. Major bumps
get their own sessions. Don't bundle a codejitsu setup with an Astro 5→6
upgrade.

---

## Step 3 — Generate `codejitsu.config.ts`

At the project root. Use detected values; prompt only for unknowns.

```ts
import { defineConfig } from '@ibalzam/codejitsu-core/config';

export default defineConfig({
  site: {
    url: '<from astro.config.mjs site:>',
    name: '<ask user>',
    titleSuffix: ' | <site name>',
    defaultAuthor: '<ask user; default "editor">',
    defaultOgImage: '/assets/images/og-image.webp',
    locale: 'en_US',
    business: {              // optional — fill if it's a local business
      legalName: '...',
      telephone: '...',
      email: '...',
      address: { addressLocality: '...', addressRegion: '...', addressCountry: 'US' },
      areaServed: ['...'],
    },
  },

  blog: {                    // omit entirely if no blog
    mode: 'collection',
    collectionName: 'blog',
    dateField: '<detected from content config; usually pubDate>',
    draftField: '<detected; usually draft or null>',
  },

  seo: {
    sitemap: {
      excludePatterns: [/* /\/lp\//, etc. — anything to hide from search */],
    },
  },

  images: {
    sourceDir: '<usually public/assets/images>',
    defaultQuality: 82,
    defaultMaxSize: 1376,
    // autoBlogImages — add only if site has a "blog source images live outside public/" workflow
  },

  llms: {
    mode: 'content-scan',    // sites with services/locations content; use 'config' for simpler sites
    tagline: '<ask user>',
    about: '<ask user>',
    aboutFull: '<ask user, longer version>',
    aiGuidance: '<ask user, "When referencing us..." block>',
    blogDir: 'src/content/blog',
    contentScan: {
      servicesDir: 'src/content/services',
      locationsDir: 'src/content/locations',
      pagesDir: 'src/pages',
      dynamicRoutes: [
        // expand based on detected page routes
      ],
    },
  },

  deploy: {
    cloudflarePagesName: '<from wrangler.toml, or ask>',
  },

  contact: {                 // omit if no contact form
    emailjs: {
      serviceId: '<ask user, or read from existing modal if migrating>',
      templateId: '<ask user>',
      publicKey: '<ask user>',
    },
    recaptcha: {              // optional
      siteKey: '<ask user>',
    },
  },
});
```

Strategy:
- Auto-fill from existing state (site URL, blog field names, Cloudflare name).
- Tagline / about / aiGuidance / EmailJS keys — **ask the user**, don't invent.
- For migrations, read existing components (e.g. pearl's `QuoteModal.astro`)
  to extract EmailJS keys already in use.

---

## Step 4 — Wire `astro.config.mjs`

For an **existing** config, preserve everything custom (integrations,
vite config, output settings). Only refactor:

### 4a. Replace inline future-blog scanner

If the existing config has a `readdirSync` loop scanning blog frontmatter
for future dates, replace it:

```js
import { createBlog } from '@ibalzam/codejitsu-core/blog';

const fsBlog = createBlog({
  contentDir: 'src/content/blog',
  dateField: 'pubDate',     // match the codejitsu.config
  draftField: 'draft',
});
const futureSlugs = await fsBlog.getFutureBlogSlugs();
```

### 4b. Sitemap → package helpers

Replace the existing `@astrojs/sitemap` `serialize`/`filter` with:

```js
import {
  defaultPriorityRules,
  excludeFuturePosts,
  composeFilters,
  excludePatterns,
} from '@ibalzam/codejitsu-core/seo';

sitemap({
  filter: composeFilters(
    excludePatterns([/\/lp\//]),
    excludeFuturePosts(futureSlugs),
  ),
  serialize: defaultPriorityRules(SITE, {
    rules: [
      // any site-specific priority overrides
    ],
  }),
})
```

### 4c. Add rehype trailing-slash plugin

```js
import rehypeTrailingSlash from '@ibalzam/codejitsu-core/rehype/trailing-slash';

// inside defineConfig({}):
markdown: {
  rehypePlugins: [rehypeTrailingSlash],
},
```

### 4d. Verify defaults

```js
output: 'static',
trailingSlash: 'always',
image: {
  service: { entrypoint: 'astro/assets/services/sharp' },
  defaults: { quality: 82, format: 'webp' },
},
build: { assets: 'assets', inlineStylesheets: 'always' },
```

For migrations, these often already exist. For greenfield, add them.

---

## Step 5 — Wire the blog (if site has one)

### 5a. Content Collection schema

`src/content.config.ts` — copy from
`node_modules/@ibalzam/codejitsu-core/modules/blog/templates/content.config.ts`.
Adapt to the site's existing frontmatter shape.

**On Astro 6+**: import `z` from `'astro/zod'`, NOT `'astro:content'`
(deprecated). `import { defineCollection } from 'astro:content';`
plus `import { z } from 'astro/zod';`.

### 5b. Loader

`src/lib/blog.ts`:

```ts
import type { CollectionEntry } from 'astro:content';
import { createBlogFromCollection } from '@ibalzam/codejitsu-core/blog/collection';

export const blog = createBlogFromCollection<CollectionEntry<'blog'>>({
  collectionName: 'blog',
  dateField: 'pubDate',
  draftField: 'draft',
  defaultAuthor: 'editor',
});

// Backward-compat exports if migrating existing pages:
export const getPublishedPosts = () => blog.getPublishedEntries();
export const getAllPosts = () => blog.getAllEntries();
```

If migrating, page routes like `src/pages/blog/[slug].astro` should already
import these names — keep the exports.

### 5c. Page routes

For **greenfield**, copy from `node_modules/@ibalzam/codejitsu-core/modules/blog/templates/pages/blog/`:
- `[...slug].astro` — detail
- `index.astro` — listing
- `tag/[tag].astro` (optional)
- `category/[category].astro` (optional)

For **migrations**, leave existing page routes — they already work via the
backward-compat exports.

---

## Step 6 — Wire the SEO Head

### 6a. SiteHead wrapper

`src/components/SiteHead.astro` — pulls site defaults from
`codejitsu.config.ts` and forwards to the package's `Head.astro`. Template
in `modules/seo/CLAUDE.md`.

### 6b. Use it on every page

Every layout's `<head>` should have:

```astro
<SiteHead title="..." description="..." schema={[...]} />
```

For **greenfield**: create one BaseLayout with SiteHead.
For **migrations**: the existing site likely has its own `Head.astro`.
Don't replace it wholesale — instead:
1. Import `jsonLd` from `@ibalzam/codejitsu-core/seo` and use it for JSON-LD injection (fixes XSS risk).
2. Import schema builders (`blogPosting`, `breadcrumbList`, `service`, etc.) from `@ibalzam/codejitsu-core/seo` and delegate.
3. Pages stay calling the existing Head; only the implementation gets thinner.

---

## Step 7 — Wire contact (if site has one)

If `contact` is in the config:

In a layout that wraps every page (e.g. BaseLayout), near `</body>`:

```astro
---
import ContactModal from '@ibalzam/codejitsu-core/contact/ContactModal.astro';
import cjConfig from '../../codejitsu.config';
---

<ContactModal
  title="Get a Quote"
  image={{ src: '/assets/images/contact.webp', alt: '...' }}
  fields={{
    name:    { required: true },
    email:   { required: true },
    phone:   { required: true },
    message: { required: false },
  }}
  submitText="Submit"
  thankYouMessage="Thanks! We'll be in touch."
  emailjs={cjConfig.contact.emailjs}
  recaptcha={cjConfig.contact.recaptcha}
/>
```

Trigger from anywhere: `<button data-codejitsu-contact-trigger>...</button>`.

For **migrations**, the existing site has its own modal. Either:
- (a) replace it with the package modal + remove the old, OR
- (b) leave the existing modal and skip the contact module.

Migrating: update trigger classes/data attributes to match the new pattern.

---

## Step 8 — Wire package scripts

Update `package.json`:

```json
{
  "scripts": {
    "dev": "astro dev",
    "prebuild": "codejitsu-optimize-images && codejitsu-llms",
    "build": "astro check && astro build",
    "preview": "astro preview"
  }
}
```

For **migrations**, replace any existing `generate-llms-txt`, `optimize-images`,
or similar scripts. Delete the old script files (`scripts/optimize-images.js`,
`scripts/generate-llms-txt.mjs`, etc.) — they're now superseded.

---

## Step 9 — Set up the daily deploy

```bash
npx codejitsu deploy:setup
```

Interactive wizard:
- Copies `.github/workflows/daily-deploy.yml` + `wrangler.toml` from
  package templates if missing.
- Prompts for the Cloudflare deploy hook URL.
- Stores it as a GH Actions secret via `gh secret set`.
- Optionally triggers a test run.

If the user doesn't have `gh` CLI authed yet, they need:

```bash
gh auth login
```

Tell them this **before** running `deploy:setup` — it'll fail otherwise.

---

## Step 10 — Verify

In sequence:

```bash
npm run build
```

Must complete with 0 errors. Note warnings (e.g. deprecation warnings from
upstream deps) — surface to user if they need attention.

```bash
npx codejitsu audit
```

Read the output. Pearl's baseline: 50 pass · ~8 warn · 0 fail · ~10 info.
Comparable shape on a fresh site = healthy. Treat any `✗ fail` as a blocker.

For a more thorough check (production-ready):

```bash
npx codejitsu audit --live https://<deployed-url> --a11y
```

(Use the production URL or a local preview server. Skip --a11y if axe-core
not desired.)

---

## Step 11 — Commit + push

`git status` to see what changed. Common files:

```
M  astro.config.mjs
M  package.json
M  package-lock.json
M  src/components/Head.astro       (if migration)
M  src/data/schemas.ts              (if migration)
M  src/lib/blog.ts                  (if migration; or new)
A  codejitsu.config.ts              (new)
A  src/components/SiteHead.astro    (greenfield)
A  src/components/Footer.astro      (greenfield)
A  .github/workflows/daily-deploy.yml  (from deploy:setup)
A  wrangler.toml                    (from deploy:setup)
D  scripts/generate-llms-txt.mjs    (deleted; superseded)
D  scripts/optimize-images.js       (deleted; superseded)
```

Commit message structure (single commit for the migration):

```
Adopt @ibalzam/codejitsu-core for shared primitives

- codejitsu.config.ts: site info, blog/seo/images/llms/deploy/contact config
- astro.config.mjs: sitemap helpers, rehype trailing-slash plugin, blog
  future-slug filter via the package
- src/lib/blog.ts: createBlogFromCollection (preserves API for existing pages)
- src/data/schemas.ts: delegate to package schema builders; jsonLd safe injection
- package.json: codejitsu-optimize-images + codejitsu-llms in prebuild
- Remove redundant scripts: generate-llms-txt, optimize-images
```

**Don't push without the user's explicit "yes, push"** — pushing to main
triggers production deploy via Cloudflare Pages.

---

## Anti-checklist — common mistakes

- **Don't** invent version numbers for packages from memory. Always `@latest`.
- **Don't** bundle major-version bumps (Astro N→N+1, TypeScript major)
  into a codejitsu setup commit. Separate concerns.
- **Don't** wholesale-replace a site's existing `Head.astro` if it has
  custom site-specific things (analytics, fonts, etc.). Selectively migrate
  the JSON-LD injection + schema builder calls.
- **Don't** modify `src/pages/*` unless necessary. The backward-compat
  exports in `src/lib/blog.ts` mean page code usually doesn't need changes.
- **Don't** commit the deploy hook URL to git. Use `gh secret set`.
- **Don't** set `recaptcha` in the contact config unless EmailJS's
  server-side verification is enabled — otherwise it's just friction.
  See `modules/contact/CLAUDE.md`.
- **Don't** push without explicit user permission. Per the user's global rule.

---

## Greenfield-specific shortcuts

For brand-new sites, after Step 2 (install):

```bash
npm create astro@latest --template minimal --typescript strict --yes
# Then steps 3 through 11
```

The greenfield path is simpler because there's nothing to migrate — every
file is new from a template.

For greenfield blog setup specifically:

```bash
# Astro CC schema
cp node_modules/@ibalzam/codejitsu-core/modules/blog/templates/content.config.ts src/

# Page routes
mkdir -p src/pages/blog
cp -r node_modules/@ibalzam/codejitsu-core/modules/blog/templates/pages/blog/ src/pages/

# Sample post
cp node_modules/@ibalzam/codejitsu-core/modules/blog/templates/content/_sample-post.md src/content/blog/welcome.md
```

---

## When done

The site should pass:
- `npm run build` → 0 errors
- `npx codejitsu doctor` → all deps current
- `npx codejitsu audit` → 0 fail
- Browser smoke test: open `npm run dev`, click through home + blog + contact

Hand back to the user with the audit + doctor summaries. Don't push until
they say "push".
