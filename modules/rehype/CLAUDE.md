# Rehype module — instructions for Claude

When the user asks to **fix trailing-slash bugs in markdown content** (or pre-empt them across a Codejitsu site), wire up `rehypeTrailingSlash`.

## What this module provides

A single rehype plugin: `trailingSlash`. Runs during Astro's markdown→HTML conversion. Walks the HTML AST and rewrites internal `<a href="/foo">` to `<a href="/foo/">` (or vice versa with `policy: 'never'`).

**Why this exists:** Astro's `trailingSlash: 'always'` config covers route resolution and `Astro.url.pathname` but does NOT touch href strings written by humans in markdown or `.astro` files. This plugin closes that gap for markdown-rendered HTML.

It does **not** affect href strings inside `.astro` component source (Astro doesn't run rehype on those). Use the audit to catch those.

## Wiring it into a site

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import trailingSlash from '@ibalzam/codejitsu-core/rehype/trailing-slash';

export default defineConfig({
  markdown: {
    rehypePlugins: [trailingSlash],
  },
});
```

With explicit options:

```ts
rehypePlugins: [
  [trailingSlash, { policy: 'always' }],
],
```

## What it does NOT touch

- External URLs (`http://`, `https://`, `//`)
- `mailto:`, `tel:`, `javascript:`
- Anchor-only links (`#section`)
- Paths ending in a file extension (`.pdf`, `.html`, `.webp`, etc.)
- Root path (`/`)

## What it DOES touch

- `<a href="/foo">` → `<a href="/foo/">`
- `<a href="/foo?bar=1">` → `<a href="/foo/?bar=1">`
- `<a href="/foo#section">` → `<a href="/foo/#section">`

Preserves query strings and fragments. Path-only modification.

## What must NOT be done

- **Don't apply this to `.astro` component files** — the plugin runs on markdown rehype, not Astro components. If a `<a href="/foo">` lives in a `.astro` file, the plugin can't see it.
- **Don't set `policy: 'never'` if `astro.config` has `trailingSlash: 'always'`** — they'd contradict each other. The audit will flag the inconsistency.
- **Don't run this with `policy: 'preserve'` and expect anything to change** — that mode is a no-op (registered as a placeholder for symmetry).

## Verify after wiring

```bash
npm run build
npx codejitsu audit
```

The audit's "All internal links end with /" check should now report 0 markdown-level offenders. Component-level offenders (in `.astro` files) still surface — those must be fixed by hand.
