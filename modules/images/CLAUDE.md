# Images module — instructions for Claude

When the user asks to **set up codejitsu/core/images** (or "wire up the image pipeline", "convert PNGs to WebP", "automate blog images"), do the following.

## What this module provides

Three layers — use whichever you need:

1. **Astro sharp service** (runtime, automatic) — `<Image>` / `<Picture>` in `.astro` files. Configured in `astro.config.mjs`.
2. **`codejitsu-optimize-images` CLI** — recursive PNG/JPG → WebP pre-pass for `public/` (general site assets, logos, hero images). Per-file `specialRules` overrides.
3. **`autoBlogImages` mode** — given a content collection of `<slug>.md` files and a source-image directory with `<slug>.<ext>` files, emits optimized WebPs to an output dir. Replaces hand-maintained title→slug maps.

All three read from the **single `codejitsu.config.ts`** at site root.

## Wiring it into a site

### 1. Configure Astro sharp service

In `astro.config.mjs`:

```ts
image: {
  service: { entrypoint: 'astro/assets/services/sharp' },
  defaults: { quality: 82, format: 'webp' },
},
```

### 2. Configure the CLI in `codejitsu.config.ts`

```ts
import { defineConfig } from '@ibalzam/codejitsu-core/config';

export default defineConfig({
  site: { url: '...', name: '...' },
  images: {
    // General optimizer — scan a dir, convert every PNG/JPG to WebP.
    sourceDir: 'public/assets/images',
    defaultQuality: 82,
    defaultMaxSize: 1376,

    specialRules: {
      'logos/logo': { maxWidth: 400, quality: 35, generateAvif: true },
      'sharing/og-default': { maxWidth: 1200, maxHeight: 630, quality: 85, optimizePng: true },
    },

    // Blog image automation — one image per post slug.
    autoBlogImages: {
      contentDir: 'src/content/blog',
      sourceImageDir: 'private/blog-source-images',   // not committed
      outputDir: 'public/assets/images/blog',
      width: 1376,
      height: null,                                    // preserve aspect ratio
      quality: 82,
    },
  },
});
```

### 3. Wire into prebuild

```json
{
  "scripts": {
    "prebuild": "codejitsu-optimize-images",
    "build": "astro build"
  }
}
```

### 4. Workflow for new blog images (with autoBlogImages)

1. Generate or save the source image (any size, any format).
2. **Name it after the post slug** — e.g. `backyard-patio-ideas-henderson-summer-heat.png`.
3. Place it in `images.autoBlogImages.sourceImageDir`.
4. Run `npm run prebuild` (or just `npm run build` — it runs prebuild first).
5. The optimized WebP appears at `<outputDir>/<slug>.webp`. Commit it.

The CLI warns about post slugs with no matching source image. No more hand-edited maps.

## What must NOT be done

- **Don't keep an old `codejitsu-images.config.mjs` file around.** v0.2.0 hard-broke it; only `codejitsu.config.ts` is read.
- **Don't reference `.png` in production HTML when a `.webp` exists** at the same path. The Astro `<Image>` component handles it; raw `<img src>` must point to the `.webp`.
- **Don't put source images for `autoBlogImages` inside `public/`.** They get served. Use a sibling dir like `private/blog-source-images/` (and add it to `.gitignore` if the sources are heavy / AI-generated).
- **Don't run the optimizer expecting it to skip up-to-date general files.** Only `autoBlogImages` does mtime-based skipping. The general optimizer re-processes every file (so quality changes propagate). Re-running is cheap.
- **Don't put `autoBlogImages.sourceImageDir` and `outputDir` to the same place.** That'd recursively re-optimize outputs.

## Verify

- [ ] `codejitsu.config.ts` has an `images` section.
- [ ] `prebuild` script in `package.json` runs `codejitsu-optimize-images`.
- [ ] Every PNG/JPG in `images.sourceDir` has a `.webp` sibling after build.
- [ ] If `autoBlogImages` is configured: every `.md` in `contentDir` has a matching `.webp` in `outputDir`.
- [ ] No `<img src="*.png">` in built HTML where a `.webp` sibling exists.
