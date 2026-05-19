import type { CollectionEntry } from 'astro:content';
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

export const blog = createBlogFromCollection<CollectionEntry<'blog'>>({
  collectionName: 'blog',
  // Match the field name in your Astro CC schema (`src/content.config.ts`).
  dateField: 'pubDate',
  // Set to null if your schema has no `draft` field.
  draftField: 'draft',
  defaultAuthor: 'TODO: Site Author',
  categories,
});

// Optional backward-compat exports for sites migrating from a homegrown loader.
// Delete these if you don't need them.
export const getPublishedPosts = () => blog.getPublishedEntries();
export const getAllPosts = () => blog.getAllEntries();
