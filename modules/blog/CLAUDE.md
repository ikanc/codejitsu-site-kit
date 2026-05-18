# Blog module — instructions for Claude

When the user asks to **implement codejitsu/core/blog** (or "add the blog system", "wire up the blog"), do the following.

## What this module provides

A markdown blog with two loader variants — pick whichever fits the project:

- **`createBlogFromCollection`** — uses Astro Content Collections. **Use this for any Astro site.** Type-safe via the collection's Zod schema, schema-validated, HMR works.
- **`createBlog`** — reads `content/blog/*.md` via gray-matter directly. Use for non-Astro projects or when CC isn't an option.

Both variants return the same `BlogAPI`:

```ts
getAllPosts()                  // Published posts (date <= today, not draft). Sorted newest first.
getAllPostsIncludingFuture()   // All non-draft posts.
getFutureBlogSlugs()           // Slugs of future-dated drafts (for sitemap exclusion).
getAllPostSlugs()              // Every slug for getStaticPaths (includes future, excludes drafts).
getPostBySlug(slug)            // Resolves filename-slug OR canonical (frontmatter) slug.
getAllTags() / getPostsByTag(tag)
getAllCategorySlugs() / getCategoryBySlug(slug) / getPostsByCategory(slug)
```

## Wiring into an Astro site

### 1. Set up the Content Collection

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),      // ← date field; configure dateField to match
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('editor'),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    faqs: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }),
});

export const collections = { blog };
```

### 2. Configure in `codejitsu.config.ts`

```ts
import { defineConfig } from '@ibalzam/codejitsu-core/config';

export default defineConfig({
  site: { url: '...', name: '...', defaultAuthor: 'editor' },
  blog: {
    mode: 'collection',
    collectionName: 'blog',
    dateField: 'pubDate',          // matches the CC schema field
    draftField: 'draft',
    // categories: [...]            // optional
  },
});
```

### 3. Create the loader

```ts
// src/lib/blog.ts
import { createBlogFromCollection } from '@ibalzam/codejitsu-core/blog';

export const blog = createBlogFromCollection({
  collectionName: 'blog',
  dateField: 'pubDate',
  draftField: 'draft',
  defaultAuthor: 'editor',
});
```

### 4. Use in pages

```astro
---
// src/pages/blog/[slug].astro
import { blog } from '~/lib/blog';

export async function getStaticPaths() {
  const slugs = await blog.getAllPostSlugs();  // includes future-dated for OG scrapers
  return slugs.map((slug) => ({ params: { slug } }));
}

const post = await blog.getPostBySlug(Astro.params.slug as string);
if (!post) return Astro.redirect('/404');
---
```

### 5. Wire scheduled-post filter into the sitemap

In `astro.config.mjs`, get future slugs from the blog instance and pass to the sitemap's `excludeFuturePosts` filter:

```ts
import { blog } from './src/lib/blog';
import { excludeFuturePosts, defaultPriorityRules } from '@ibalzam/codejitsu-core/seo/sitemap';

const futureSlugs = await blog.getFutureBlogSlugs();

sitemap({
  filter: excludeFuturePosts(futureSlugs),
  serialize: defaultPriorityRules(SITE),
});
```

## Frontmatter shape

Required: `title`, `description`, date (default field name `date`, configurable via `dateField`).
Recommended: `image`, `tags`, `author`.
Optional: `slug` (canonical override), `faqs`, `draft`, `updatedDate`.

Field names are flexible — set `dateField` and `draftField` in your CC schema and they'll flow through.

## Dual-slug behavior

If a post's frontmatter has `slug: 'short-form'` and its filename is `2026-02-08-long-form.md`, **both URLs resolve to the same post** but `slug` (frontmatter) is canonical. This lets you ship short URLs while keeping date-prefixed URLs alive. Set `<link rel="canonical">` to the frontmatter slug.

## What must NOT be done

- **Don't use `createBlog` (fs mode) in an Astro project.** You lose schema validation, HMR, type safety. Always prefer `createBlogFromCollection`.
- **Don't bypass `getAllPosts()` for the listing.** It filters future-dated and drafts; bypassing leaks drafts.
- **Don't use `getAllPosts()` for `getStaticPaths`** — use `getAllPostSlugs()` so future-dated posts stay buildable (OG scrapers need to reach them before publish day).
- **Don't read the collection directly** (e.g. `await getCollection('blog')`) in pages. Use the `blog` instance from `src/lib/blog.ts` so filtering/sorting/date logic stays in one place.
- **Don't change `dateField` mid-project** without renaming the frontmatter field in every existing post.

## Verify

Run `modules/blog/checklist.md` after wiring.
