# Images module — instructions for Claude

When the user asks to **set up codejitsu/core/images** (or "wire up the image pipeline", "convert PNGs to WebP"), do the following.

## What this module provides

Two complementary layers:

1. **Astro sharp service** (runtime, automatic) — handles `<Image>` imports and `<Picture>` components inside `.astro` files. Configured in `astro.config.mjs`.
2. **Pre-pass CLI** (`npx codejitsu-optimize-images`) — recursively converts every `.png`/`.jpg`/`.jpeg` in `public/images/` to `.webp` (plus thumbnails). For images referenced by URL (in HTML strings, CSS `background-image`, or `<img src>` outside Astro processing).

Both layers are needed. Astro's service can't reach files referenced by URL; the pre-pass can't add the responsive variants Astro generates.

## Wiring it into a site

### 1. Configure Astro

In `astro.config.mjs`:

```ts
export default defineConfig({
  // ...
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
    defaults: { quality: 82, format: 'webp' },
  },
});
```

### 2. Copy the optimizer config

Copy `templates/codejitsu-images.config.mjs` → site root. Edit `specialRules` for any images that need special handling (logo, OG share images, hero images that need aggressive compression).

### 3. Wire the pre-pass into the build

In the site's `package.json`:

```json
{
  "scripts": {
    "prebuild": "codejitsu-optimize-images",
    "build": "astro build"
  }
}
```

If the site already has a `prebuild` script, chain: `"prebuild": "codejitsu-optimize-images && existing-script"`.

### 4. Run once

```bash
npm run prebuild
```

Every PNG/JPG in `public/images/` now has a `.webp` sibling. References in HTML/CSS should use the `.webp` filename.

## How to reference images in templates

- **In Astro `<Image>` / `<Picture>`:** import from `src/assets/` or `~/assets/`. Astro processes them. Format defaults to WebP.
- **In raw `<img>` / CSS `background-image`:** reference the `.webp` file directly. Don't reference `.png` if a `.webp` exists.
- **OG / share images:** these are referenced by absolute URL on a CDN. Set `optimizePng: true` in `specialRules` so the original PNG is also compressed (Facebook scrapers sometimes prefer PNG over WebP).

## What must NOT be done

- **Don't reference `.png` in production HTML when the same image exists as `.webp`.** The `<img src="/images/x.png">` should be `<img src="/images/x.webp">`. Checklist enforces this.
- **Don't commit the generated `.webp` files... actually, DO commit them.** They're build artifacts but committing avoids forcing CI to install sharp. (Re-evaluate if `public/images` grows huge.)
- **Don't run the optimizer manually expecting it to skip already-converted files.** Sharp re-processes each run; this is intentional (so quality changes propagate). Re-running is cheap because outputs are written to siblings, not appended.
- **Don't put the optimizer in a `postinstall` hook.** Building on every `npm install` is annoying.
- **Don't add raw PNG/JPG to `src/assets/` for Astro `<Image>` use.** Astro handles those fine; the pre-pass is only for `public/`.

## Verify

- [ ] `astro.config.mjs` has `image.defaults: { format: 'webp' }`.
- [ ] `codejitsu-images.config.mjs` exists at site root.
- [ ] `package.json` calls `codejitsu-optimize-images` in `prebuild`.
- [ ] Every `.png`/`.jpg` in `public/images/` has a `.webp` sibling after build.
- [ ] No `<img src="*.png">` in built HTML where a `.webp` sibling exists.
