// FS + gray-matter variant — use for non-Astro projects (Next.js, etc.).
// For Astro, see `blog.ts` (uses Content Collections).

import { createBlog, type BlogCategory } from '@ibalzam/codejitsu-core/blog';

const categories: BlogCategory[] = [];

export const blog = createBlog({
  contentDir: 'content/blog',
  dateField: 'date',           // 'date' or 'pubDate' depending on your frontmatter
  draftField: null,            // set to 'draft' if your frontmatter uses it
  defaultAuthor: 'TODO: Site Author',
  categories,
});
