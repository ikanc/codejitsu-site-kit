# Config module — instructions for Claude

The unified config drives every other module. When you set up a Codejitsu site, **always create `codejitsu.config.ts` first** — every other module reads from it.

## What this module provides

- `defineConfig(config)` — identity helper that types your config (autocomplete + validation in editors).
- `loadConfig(cwd?)` — used internally by the CLIs to resolve the config from the site's working directory.
- `isModuleEnabled(config, name)` — utility for module-aware code paths.
- Full type definitions (`CodejitsuConfig`, `SiteConfig`, `BlogConfig`, etc.).

## Wiring into a site

### 1. Create `codejitsu.config.ts` at the site root

```ts
import { defineConfig } from '@ibalzam/codejitsu-core/config';

export default defineConfig({
  site: {
    url: 'https://example.com',
    name: 'Example',
    titleSuffix: ' — Example',
    defaultAuthor: 'editor',
    defaultOgImage: '/og-image.webp',
    locale: 'en-US',
    business: {
      telephone: '+1-555-555-5555',
      email: 'hello@example.com',
      address: { addressLocality: 'Las Vegas', addressRegion: 'NV', addressCountry: 'US' },
      areaServed: ['Las Vegas', 'Henderson'],
    },
  },

  blog: {
    mode: 'collection',         // Astro Content Collections
    collectionName: 'blog',
    dateField: 'pubDate',        // pearl pattern
    draftField: 'draft',
  },

  seo: {
    sitemap: {
      excludePatterns: [/\/lp\//],
    },
    defaultSchemas: ['localBusiness', 'website'],
  },

  images: {
    sourceDir: 'public/assets/images',
    defaultQuality: 82,
    defaultMaxSize: 1376,
    specialRules: {
      'logos/logo': { maxWidth: 400, quality: 35 },
    },
  },

  llms: {
    mode: 'content-scan',
    contentScan: {
      servicesDir: 'src/content/services',
      locationsDir: 'src/content/locations',
      pagesDir: 'src/pages',
    },
    blogDir: 'src/content/blog',
  },

  deploy: { cloudflarePagesName: 'example' },
});
```

### 2. Install jiti (only if using `.ts`)

```bash
npm install -D jiti
```

`.mjs` and `.json` configs work without jiti.

### 3. The CLIs find it automatically

`codejitsu-optimize-images`, `codejitsu-llms`, and `codejitsu-check` all read from this one file. No more per-module config files.

## Search order

The loader looks for, in order:
1. `codejitsu.config.ts`
2. `codejitsu.config.mts`
3. `codejitsu.config.mjs`
4. `codejitsu.config.js`
5. `codejitsu.config.json`
6. `codejitsu` key in `package.json`

First match wins. Stop searching after one is found.

## Disabling a module

Two ways:

```ts
// Explicit:
export default defineConfig({
  site: {...},
  blog: { enabled: false },
});

// Or omit the key entirely:
export default defineConfig({
  site: {...},
  // no blog → blog module is disabled
});
```

The checklist runner uses `isModuleEnabled()` to skip checks for disabled modules.

## What must NOT be done

- **Don't keep old per-module config files alongside the new one.** v0.2.0 hard-breaks `codejitsu-images.config.mjs` and `codejitsu-llms.config.mjs`. Delete them.
- **Don't store secrets in this config.** It ships to the client in some module configurations (e.g. business info → schema.org). Use env vars for anything sensitive.
- **Don't put computed values that depend on runtime state.** The config loads once at CLI start. If you need dynamic values (e.g. fetched from an API), do it inside the CLI's invocation, not in the config.
- **Don't duplicate `site.url` in module configs.** All modules read it from `site.url`. Setting it once means changing it once.
