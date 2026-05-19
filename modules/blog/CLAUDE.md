# Blog module — instructions for Claude

When the user asks to **implement codejitsu/core/blog** (or "add the blog system"), do the following.

## What this module provides

Two loader variants:

- **`createBlogFromCollection`** — wraps Astro Content Collections. **Use this for any Astro site.** Returns raw `CollectionEntry` objects with filtering applied, preserving `entry.data`, `entry.id`, and the ability to call `render(entry)` for `<Content />`.
- **`createBlog`** — fs + gray-matter loader. Use for non-Astro projects. Returns normalized `BlogPostMetadata` / `BlogPost` objects.

The two return **different shapes** because they serve different needs:

| | CC (`createBlogFromCollection`) | fs (`createBlog`) |
|---|---|---|
| Returns | `CollectionEntry[]` | `BlogPostMetadata[]` |
| Access | `entry.data.title`, `entry.id`, `await render(entry)` | `post.title`, `post.slug`, `post.content` (raw md) |
| Validation | Astro CC schema (Zod) | Frontmatter parsed by gray-matter, no validation |
| HMR | Yes (Astro) | No |
| Filter applied | draft + future-date | draft + future-date |
| Sort | newest first | newest first |
| Best for | Astro sites (most cases) | Non-Astro JS projects |

## CC variant API

```ts
const blog = createBlogFromCollection({
  collectionName: 'blog',
  dateField: 'pubDate',         // matches your CC schema field
  draftField: 'draft',
});

await blog.getPublishedEntries();    // CollectionEntry[] — not draft, date <= today
await blog.getAllEntries();          // CollectionEntry[] — not draft (includes future)
await blog.getEntryBySlug(slug);     // CollectionEntry | null
await blog.getFutureBlogSlugs();     // string[] — for sitemap exclusion
await blog.getAllPostSlugs();        // string[] — for getStaticPaths
await blog.getEntriesByTag(tag);     // CollectionEntry[]
await blog.getAllTags();             // string[]
await blog.getEntriesByCategory(s);  // CollectionEntry[]
blog.toMetadata(entry);              // BlogPostMetadata — normalized derivation
```

## Wiring into an Astro site

### 1. Set up the Content Collection

`src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
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
blog: {
  mode: 'collection',
  collectionName: 'blog',
  dateField: 'pubDate',
  draftField: 'draft',
},
```

### 3. Create the loader instance

```ts
// src/lib/blog.ts
import type { CollectionEntry } from 'astro:content';
import { createBlogFromCollection } from '@ibalzam/codejitsu-core/blog';

export const blog = createBlogFromCollection<CollectionEntry<'blog'>>({
  collectionName: 'blog',
  dateField: 'pubDate',
  draftField: 'draft',
});

// Backward-compat exports for sites migrating from a homegrown loader:
export const getPublishedPosts = () => blog.getPublishedEntries();
export const getAllPosts = () => blog.getAllEntries();
```

### 4. Use in pages

```astro
---
// src/pages/blog/[slug].astro
import { render } from 'astro:content';
import { blog } from '~/lib/blog';

export async function getStaticPaths() {
  const entries = await blog.getAllEntries();  // includes future-dated for OG scrapers
  return entries.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
---
<article>
  <h1>{entry.data.title}</h1>
  <Content />
</article>
```

### 5. Wire scheduled-post filter into the sitemap

```ts
// astro.config.mjs
import { createBlog } from '@ibalzam/codejitsu-core/blog';
import { excludeFuturePosts, defaultPriorityRules } from '@ibalzam/codejitsu-core/seo';

// Use the fs loader here — astro.config runs before Astro's CC is initialized.
const fsBlog = createBlog({ contentDir: 'src/content/blog', dateField: 'pubDate', draftField: 'draft' });
const futureSlugs = await fsBlog.getFutureBlogSlugs();

sitemap({
  filter: excludeFuturePosts(futureSlugs),
  serialize: defaultPriorityRules(SITE),
});
```

## What must NOT be done

- **Don't use `createBlog` (fs) inside Astro pages.** You lose Astro's `render()` (needed for `<Content />`) and CC schema validation. Always prefer `createBlogFromCollection` in pages.
- **Don't access raw `getCollection('blog')` directly.** Go through the blog instance from `src/lib/blog.ts` so filtering/sorting/date logic stays in one place.
- **Don't use `getPublishedEntries()` for `getStaticPaths`** — use `getAllEntries()` so future-dated posts stay buildable (OG scrapers need to reach them before publish day).
- **Don't change `dateField` mid-project** without renaming the frontmatter field in every existing post AND updating the CC schema field name to match.
- **Don't rely on the CC variant's filtering for security.** A draft post's URL is still discoverable if anyone shares it. Use middleware/headers for true access control.

## Verify

Run `modules/blog/checklist.md` after wiring.
