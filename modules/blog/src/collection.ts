import readingTime from 'reading-time';
import type {
  BlogAPI,
  BlogCategory,
  BlogPost,
  BlogPostMetadata,
  CommonBlogConfig,
} from './types.js';

export interface CollectionBlogConfig extends CommonBlogConfig {
  /** Astro Content Collection name. Default 'blog'. */
  collectionName?: string;
}

/** Minimal shape of an Astro CollectionEntry that we depend on. */
interface AstroCollectionEntry {
  id: string;
  slug: string;
  data: Record<string, unknown>;
  body: string;
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

/**
 * Astro Content Collections blog loader. Use this in Astro projects.
 *
 * Dynamically imports `astro:content` at call time so the rest of this package
 * stays usable in non-Astro environments. Throws a clear error if Astro is missing.
 */
export function createBlogFromCollection(config: CollectionBlogConfig = {}): BlogAPI {
  const collectionName = config.collectionName ?? 'blog';
  const defaultAuthor = config.defaultAuthor;
  const categories = config.categories ?? [];
  const dateField = config.dateField ?? 'date';
  const draftField = config.draftField ?? null;

  async function getCollection(): Promise<AstroCollectionEntry[]> {
    let mod: { getCollection: (name: string) => Promise<AstroCollectionEntry[]> };
    try {
      // @ts-expect-error - 'astro:content' is a virtual module resolved by Astro at build time.
      mod = await import('astro:content');
    } catch (err) {
      throw new Error(
        `createBlogFromCollection() requires Astro and a configured content collection ` +
          `named '${collectionName}'. Add Astro to the project or use createBlog() (fs+gray-matter) instead. ` +
          `Original error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    return mod.getCollection(collectionName);
  }

  async function readAll(): Promise<AstroCollectionEntry[]> {
    const all = await getCollection();
    if (!draftField) return all;
    return all.filter((e) => !e.data[draftField]);
  }

  function toMetadata(e: AstroCollectionEntry): BlogPostMetadata {
    const canonicalSlug = (e.data.slug as string | undefined) || e.slug;
    return {
      slug: canonicalSlug,
      title: (e.data.title as string) ?? '',
      description: (e.data.description as string) ?? '',
      date: asISO(e.data[dateField]),
      author: (e.data.author as string) ?? defaultAuthor,
      image: e.data.image as string | undefined,
      tags: e.data.tags as string[] | undefined,
      readingTime: readingTime(e.body).text,
    };
  }

  async function getAllPostsIncludingFuture(): Promise<BlogPostMetadata[]> {
    const entries = await readAll();
    return entries
      .map(toMetadata)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async function getAllPosts(): Promise<BlogPostMetadata[]> {
    const today = getTodayUTC();
    const all = await getAllPostsIncludingFuture();
    return all.filter((p) => new Date(p.date) <= today);
  }

  async function getFutureBlogSlugs(): Promise<string[]> {
    const today = getTodayUTC();
    const entries = await readAll();
    const slugs = new Set<string>();
    for (const e of entries) {
      const date = asISO(e.data[dateField]);
      if (!date) continue;
      if (new Date(date) > today) {
        const canonical = (e.data.slug as string | undefined) || e.slug;
        slugs.add(canonical);
        if (e.slug !== canonical) slugs.add(e.slug);
      }
    }
    return Array.from(slugs);
  }

  async function getAllPostSlugs(): Promise<string[]> {
    const entries = await readAll();
    const slugs = new Set<string>();
    for (const e of entries) {
      slugs.add(e.slug);
      const canonical = (e.data.slug as string | undefined) || e.slug;
      if (canonical !== e.slug) slugs.add(canonical);
    }
    return Array.from(slugs);
  }

  async function getPostBySlug(slug: string): Promise<BlogPost | null> {
    const entries = await readAll();
    const match = entries.find((e) => {
      const canonical = (e.data.slug as string | undefined) || e.slug;
      return canonical === slug || e.slug === slug;
    });
    if (!match) return null;
    return {
      ...toMetadata(match),
      faqs: match.data.faqs as BlogPost['faqs'],
      content: match.body,
    };
  }

  async function getAllTags(): Promise<string[]> {
    const posts = await getAllPosts();
    const tags = new Set<string>();
    posts.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }

  async function getPostsByTag(tag: string): Promise<BlogPostMetadata[]> {
    const posts = await getAllPosts();
    return posts.filter((p) => p.tags?.includes(tag));
  }

  function getAllCategorySlugs(): string[] {
    return categories.map((c) => c.slug);
  }

  function getCategoryBySlug(slug: string): BlogCategory | undefined {
    return categories.find((c) => c.slug === slug);
  }

  async function getPostsByCategory(slug: string): Promise<BlogPostMetadata[]> {
    const cat = getCategoryBySlug(slug);
    if (!cat) return [];
    const posts = await getAllPosts();
    return posts.filter((p) => p.tags?.includes(cat.tag));
  }

  return {
    getAllPosts,
    getAllPostsIncludingFuture,
    getFutureBlogSlugs,
    getAllPostSlugs,
    getPostBySlug,
    getAllTags,
    getPostsByTag,
    getAllCategorySlugs,
    getCategoryBySlug,
    getPostsByCategory,
    categories,
  };
}
