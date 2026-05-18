# Images module — checklist

## Setup

- [ ] `astro.config.mjs` has `image.service: { entrypoint: 'astro/assets/services/sharp' }`.
- [ ] `astro.config.mjs` has `image.defaults: { quality: 82, format: 'webp' }` (or justified deviation).
- [ ] `codejitsu.config.ts` has an `images` section.
- [ ] `package.json` calls `codejitsu-optimize-images` in `prebuild` (or `build`).

## General optimization

- [ ] Every PNG/JPG under `images.sourceDir` has a `.webp` sibling after build.
- [ ] Critical files have `specialRules` entries (logo, OG images, hero images).

## Blog automation (if configured)

- [ ] Every `.md` filename in `autoBlogImages.contentDir` has a matching `.webp` in `outputDir`.
- [ ] `autoBlogImages.sourceImageDir` is not inside `public/` (sources shouldn't ship to browsers).
- [ ] `autoBlogImages.sourceImageDir` is in `.gitignore` if sources are heavy or AI-generated.
- [ ] No "missing source" warnings from the last `codejitsu-optimize-images` run (or, if any, they're for posts intentionally without images).

## Production HTML

- [ ] No `<img src>` references `.png` or `.jpg` where a `.webp` exists for the same path.
- [ ] CSS `background-image` URLs reference `.webp`.
- [ ] OG / Twitter share images: PNG (for legacy scrapers) AND WebP variants; the `og:image` meta tag points to the PNG (more compatible).

## Sizes

- [ ] No single image in production `public/` is > 500KB. If so, it has a `specialRules` entry tuning quality/dimensions.
- [ ] Hero images have `width` and `height` attributes set (CLS).
