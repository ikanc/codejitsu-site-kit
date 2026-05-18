// Astro Content Collections variant — recommended for Astro sites.
// For non-Astro projects, see `blog-fs.ts` (uses gray-matter directly).

import { createBlogFromCollection, type BlogCategory } from '@ibalzam/codejitsu-core/blog';

const categories: BlogCategory[] = [
  // {
  //   slug: 'guides',
  //   tag: 'Guides',
  //   title: 'Guides',
  //   subtitle: 'Practical how-tos',
  //   metaDescription: '...',
  // },
];

export const blog = createBlogFromCollection({
  collectionName: 'blog',
  // Match the field name from your Astro CC schema (`src/content.config.ts`).
  // Common choices: 'date' (default) or 'pubDate'.
  dateField: 'pubDate',
  // Set to null if your schema has no `draft` field.
  draftField: 'draft',
  defaultAuthor: 'TODO: Site Author',
  categories,
});
