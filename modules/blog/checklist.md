# Blog module — checklist

## Setup

- [ ] `src/lib/blog.ts` exists and calls `createBlog(...)` from `@ibalzam/codejitsu-core/blog`.
- [ ] `content/blog/` directory exists; at least one `.md` post is present.
- [ ] Page routes exist: `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`.
- [ ] If site uses tags: `src/pages/blog/tag/[tag].astro` exists.
- [ ] If site uses categories: `src/pages/blog/category/[category].astro` exists and `categories` is passed to `createBlog`.

## Post frontmatter

For every post in `content/blog/`:
- [ ] `title`, `description`, `date` are present.
- [ ] `description` is < 160 chars (meta description budget).
- [ ] `date` is ISO `YYYY-MM-DD` format.
- [ ] If `image` is set, the file exists in `public/`.
- [ ] If `faqs` is set, every entry has both `question` and `answer`.

## Build behaviour

- [ ] Future-dated posts are absent from `dist/blog/index.html` (listing).
- [ ] Future-dated posts ARE built at `dist/blog/<slug>/index.html` (so OG scrapers can reach them).
- [ ] `sitemap-index.xml` does NOT contain URLs for future-dated posts.

## SEO

- [ ] Each blog post page has `BlogPosting` JSON-LD schema (use `@ibalzam/codejitsu-core/seo/schema`).
- [ ] If post has `faqs`, the page also has `FAQPage` JSON-LD.
- [ ] Post pages have OG image set to `frontmatter.image` (absolute URL).
- [ ] Canonical URL on a post points to the canonical (frontmatter) slug, not the filename slug.

## Daily deploy

- [ ] `.github/workflows/daily-deploy.yml` is present (see `modules/deploy/`).
- [ ] `CLOUDFLARE_DEPLOY_HOOK_URL` secret is configured in the repo.
