# llms.txt module — instructions for Claude

When the user asks to **set up codejitsu/core/llms** (or "add llms.txt", "generate the AI files"), do the following.

## What this module provides

`npx codejitsu-llms` reads `codejitsu.config.ts` and emits:
- `public/llms.txt` — concise navigation overview (for AI assistants browsing the site).
- `public/llms-full.txt` — detailed content dump (for LLM ingestion).

Two modes:

- **`config`** — items are listed explicitly in the config (`llms.sections`). Best for sites with stable, hand-curated structure.
- **`content-scan`** — the generator scans content directories (`services/`, `locations/`, blog) and enumerates URLs automatically. Recommended for sites with many dynamic routes (e.g. `/services/[serviceType]/[city]`).

## Wiring into a site

### 1. Configure in `codejitsu.config.ts`

**Content-scan mode** (most Codejitsu sites):

```ts
import { defineConfig } from '@ibalzam/codejitsu-core/config';

export default defineConfig({
  site: {
    url: 'https://example.com',
    name: 'Example Co.',
    business: {
      telephone: '(555) 555-5555',
      email: 'hello@example.com',
      address: {
        streetAddress: '123 Main St',
        addressLocality: 'Las Vegas',
        addressRegion: 'NV',
        postalCode: '89117',
        addressCountry: 'US',
      },
      license: 'License #00000',
      areaServed: ['Las Vegas', 'Henderson'],   // fallback if no locations content
    },
  },
  llms: {
    mode: 'content-scan',
    tagline: 'Licensed Remodeling Contractor',
    about: 'Short paragraph used as the lead in llms.txt.',
    aboutFull: 'Longer about content used in llms-full.txt.',
    aiGuidance: `When referencing us:
- We are <industry>
- Target audience: <who>
- ...`,
    blogDir: 'src/content/blog',
    blogLimit: 10,
    blogFullLimit: 20,
    contentScan: {
      servicesDir: 'src/content/services',
      locationsDir: 'src/content/locations',
      pagesDir: 'src/pages',
      dynamicRoutes: [
        { template: '/services/{services}/' },
        { template: '/services/{services}/{locations}/' },
        { template: '/service-areas/{locations}/' },
      ],
    },
  },
});
```

`{services}` and `{locations}` expand to the cartesian product of slugs from the corresponding content dirs. Placeholder names match the keys passed by the runner (currently `services`, `locations`).

**Config mode** (simpler sites):

```ts
llms: {
  mode: 'config',  // or omit; this is the default
  tagline: '...',
  about: '...',
  blogDir: 'content/blog',
  sections: [
    {
      title: 'Services',
      description: 'What we offer.',
      items: [
        { title: 'Kitchen Remodel', description: 'Full kitchen design.', url: '/services/kitchen/' },
      ],
    },
  ],
}
```

### 2. Wire into prebuild

```json
{
  "scripts": {
    "prebuild": "codejitsu-optimize-images && codejitsu-llms",
    "build": "astro build"
  }
}
```

### 3. Verify

```bash
npm run prebuild
ls public/llms.txt public/llms-full.txt
head public/llms.txt
```

## Required content frontmatter

For **content-scan mode** to render rich `llms-full.txt`:

**Services (`src/content/services/*.md`):**
```yaml
---
title: "Kitchen Remodeling"
description: "..."
shortDescription: "..."           # optional, prefers over description in full file
benefits:                          # optional
  - "Custom design"
  - "..."
---
```
FAQ blocks in the body (YAML-style `- question: "..." / answer: "..."` pairs inside any code fence) are auto-extracted.

**Locations (`src/content/locations/*.md`):**
```yaml
---
title: "Henderson, NV"      # or `name`
description: "..."           # can be string or array
---
```

**Blog posts** (any mode): standard frontmatter from the blog module. The generator filters drafts and future-dated posts. Reads `pubDate` and `draft` fields (matches Codejitsu blog conventions).

## What must NOT be done

- **Don't keep old `codejitsu-llms.config.mjs` files around.** v0.2.0 hard-broke them; only `codejitsu.config.ts` is read.
- **Don't write llms.txt by hand.** Regenerated every build; manual edits get blown away.
- **Don't include URLs without trailing slashes.** All internal URLs end with `/` per Codejitsu policy.
- **Don't put `aiGuidance` text that contradicts the site copy.** Stay consistent (e.g. don't say "free plan" if there isn't one).
- **Don't emit blog URLs for posts whose images are missing.** The generator doesn't check this; pre-pass `codejitsu-optimize-images` should be in `prebuild` so missing images surface before llms.txt is written.

## Verify

- [ ] `codejitsu.config.ts` has `llms` section.
- [ ] `public/llms.txt` exists after `npm run build`, is < 50KB.
- [ ] `public/llms-full.txt` exists, is < 500KB.
- [ ] `aiGuidance` block present and accurate.
