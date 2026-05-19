// @ts-expect-error - 'astro:content' is a virtual module resolved by Astro at build time.
// Static import (not dynamic) so Vite/Astro processes the dependency correctly.
// This file is only safe to import from inside an Astro project. It lives at the
// `/blog/collection` subpath; sites that aren't Astro should import from `/blog`
// (which doesn't pull this in).
import { getCollection as astroGetCollection } from 'astro:content';
import readingTime from 'reading-time';
import type {
  BlogCategory,
  BlogCollectionAPI,
  BlogCollectionEntry,
  BlogPostMetadata,
  CommonBlogConfig,
} from './types.js';

export interface CollectionBlogConfig extends CommonBlogConfig {
  /** Astro Content Collection name. Default 'blog'. */
  collectionName?: string;
}

function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function asISO(value: unknown): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value;
  return '';
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.valueOf()) ? null : d;
  }
  return null;
}

/**
 * Astro Content Collections blog loader. Use in any Astro project.
 *
 * Returns raw CollectionEntry objects with filtering applied (drafts excluded,
 * sorted newest first by `dateField`). Preserves `entry.data`, `entry.id`,
 * and the ability to call `render(entry)` for `<Content />`.
 *
 * Import only from inside Astro code (`src/lib/blog.ts`, page routes). Do not
 * import from `astro.config.mjs` — Astro CC isn't initialized at config time.
 * Use `createBlog` (fs) for astro.config.
 */
export function createBlogFromCollection<E extends BlogCollectionEntry = BlogCollectionEntry>(
  config: CollectionBlogConfig = {}
): BlogCollectionAPI<E> {
  const collectionName = config.collectionName ?? 'blog';
  const defaultAuthor = config.defaultAuthor;
  const categories = config.categories ?? [];
  const dateField = config.dateField ?? 'date';
  const draftField = config.draftField ?? null;

  async function readAll(): Promise<E[]> {
    const all = (await astroGetCollection(collectionName)) as E[];
    const filtered = draftField ? all.filter((e) => !e.data[draftField]) : all;
    return filtered.sort((a, b) => {
      const da = asDate(a.data[dateField])?.valueOf() ?? 0;
      const db = asDate(b.data[dateField])?.valueOf() ?? 0;
      return db - da;
    });
  }

  async function getAllEntries(): Promise<E[]> {
    return readAll();
  }

  async function getPublishedEntries(): Promise<E[]> {
    const today = getTodayUTC();
    const all = await readAll();
    return all.filter((e) => {
      const d = asDate(e.data[dateField]);
      return d ? d <= today : true;
    });
  }

  async function getFutureBlogSlugs(): Promise<string[]> {
    const today = getTodayUTC();
    const all = await readAll();
    return all
      .filter((e) => {
        const d = asDate(e.data[dateField]);
        return d ? d > today : false;
      })
      .map((e) => e.id);
  }

  async function getAllPostSlugs(): Promise<string[]> {
    const all = await readAll();
    return all.map((e) => e.id);
  }

  async function getEntryBySlug(slug: string): Promise<E | null> {
    const all = await readAll();
    return all.find((e) => e.id === slug) ?? null;
  }

  async function getAllTags(): Promise<string[]> {
    const entries = await getPublishedEntries();
    const tags = new Set<string>();
    entries.forEach((e) => {
      const t = e.data.tags as string[] | undefined;
      t?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  async function getEntriesByTag(tag: string): Promise<E[]> {
    const entries = await getPublishedEntries();
    return entries.filter((e) => {
      const t = e.data.tags as string[] | undefined;
      return t?.includes(tag);
    });
  }

  function getAllCategorySlugs(): string[] {
    return categories.map((c) => c.slug);
  }

  function getCategoryBySlug(slug: string): BlogCategory | undefined {
    return categories.find((c) => c.slug === slug);
  }

  async function getEntriesByCategory(slug: string): Promise<E[]> {
    const cat = getCategoryBySlug(slug);
    if (!cat) return [];
    return getEntriesByTag(cat.tag);
  }

  function toMetadata(entry: E): BlogPostMetadata {
    return {
      slug: entry.id,
      title: (entry.data.title as string) ?? '',
      description: (entry.data.description as string) ?? '',
      date: asISO(entry.data[dateField]),
      author: (entry.data.author as string) ?? defaultAuthor,
      image: entry.data.image as string | undefined,
      tags: entry.data.tags as string[] | undefined,
      readingTime: readingTime(entry.body ?? '').text,
    };
  }

  return {
    getPublishedEntries,
    getAllEntries,
    getFutureBlogSlugs,
    getAllPostSlugs,
    getEntryBySlug,
    getAllTags,
    getEntriesByTag,
    getAllCategorySlugs,
    getCategoryBySlug,
    getEntriesByCategory,
    toMetadata,
    categories,
  };
}
