# Images module — checklist

## Astro

- [ ] `astro.config.mjs` has `image.service: { entrypoint: 'astro/assets/services/sharp' }`.
- [ ] `astro.config.mjs` has `image.defaults: { quality: 82, format: 'webp' }` (or justified deviation).

## Pre-pass

- [ ] `codejitsu-images.config.mjs` exists at site root.
- [ ] `package.json` calls `codejitsu-optimize-images` in `prebuild` (or `build`).
- [ ] Every PNG/JPG in `public/images/` has a `.webp` sibling.

## Production HTML

- [ ] No `<img src>` references `.png` or `.jpg` where a `.webp` exists for the same path.
- [ ] CSS `background-image` URLs reference `.webp`.
- [ ] OG / Twitter share images have both PNG (for legacy scrapers) and WebP variants; the `og:image` meta tag points to the PNG (more compatible).

## Sizes

- [ ] No single image in `public/images/` is > 500KB. If so, it has a `specialRules` entry tuning quality/dimensions.
- [ ] Hero images have `width` and `height` attributes set (CLS).
