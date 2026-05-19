export interface FAQItem {
  question: string;
  answer: string;
}

export interface BlogPostFrontmatter {
  title: string;
  description: string;
  date: string | Date;
  slug?: string;
  author?: string;
  image?: string;
  tags?: string[];
  faqs?: FAQItem[];
  draft?: boolean;
  [key: string]: unknown;
}

/** Normalized blog post (fs variant only). */
export interface BlogPostMetadata {
  slug: string;
  title: string;
  description: string;
  /** ISO date string (YYYY-MM-DD or full ISO). */
  date: string;
  author?: string;
  image?: string;
  tags?: string[];
  readingTime: string;
}

export interface BlogPost extends BlogPostMetadata {
  faqs?: FAQItem[];
  /** Raw markdown body. */
  content: string;
}

export interface BlogCategory {
  slug: string;
  tag: string;
  title: string;
  subtitle: string;
  metaDescription: string;
}

export interface CommonBlogConfig {
  defaultAuthor?: string;
  categories?: BlogCategory[];
  /** Frontmatter field name for the date. Default 'date'. */
  dateField?: string;
  /** Frontmatter field name for the draft flag. Default null (no draft support). */
  draftField?: string | null;
}

/**
 * Minimal shape of an Astro CollectionEntry that the package depends on.
 * In modern Astro (5+ with the glob loader), `id` is the slug (filename minus
 * extension). `data` is the parsed frontmatter. `body` is the raw markdown.
 *
 * Sites can cast this to `CollectionEntry<'blog'>` from `astro:content` at use
 * site to get full type information from their CC schema.
 */
export interface BlogCollectionEntry {
  id: string;
  data: Record<string, unknown>;
  /** Optional — Astro's CollectionEntry types `body` as `string | undefined`. */
  body?: string;
}

/** API for the fs (gray-matter) blog loader — normalized objects. */
export interface BlogFsAPI {
  getAllPosts(): Promise<BlogPostMetadata[]>;
  getAllPostsIncludingFuture(): Promise<BlogPostMetadata[]>;
  getFutureBlogSlugs(): Promise<string[]>;
  getAllPostSlugs(): Promise<string[]>;
  getPostBySlug(slug: string): Promise<BlogPost | null>;
  getAllTags(): Promise<string[]>;
  getPostsByTag(tag: string): Promise<BlogPostMetadata[]>;
  getAllCategorySlugs(): string[];
  getCategoryBySlug(slug: string): BlogCategory | undefined;
  getPostsByCategory(slug: string): Promise<BlogPostMetadata[]>;
  categories: BlogCategory[];
}

/**
 * API for the Astro Content Collections blog loader — raw entries.
 * Preserves full access to entry.data, entry.id, and Astro's `render()`.
 * Filtering (draft + future-date) is applied; sorting is newest-first by `dateField`.
 */
export interface BlogCollectionAPI<E extends BlogCollectionEntry = BlogCollectionEntry> {
  /** Published entries: not draft, date <= today. Sorted newest first. */
  getPublishedEntries(): Promise<E[]>;
  /** All non-draft entries (includes future-dated). Sorted newest first. */
  getAllEntries(): Promise<E[]>;
  /** Slugs of non-draft entries with a future date. */
  getFutureBlogSlugs(): Promise<string[]>;
  /** Every slug needed for static path generation (non-draft, includes future). */
  getAllPostSlugs(): Promise<string[]>;
  getEntryBySlug(slug: string): Promise<E | null>;
  getAllTags(): Promise<string[]>;
  getEntriesByTag(tag: string): Promise<E[]>;
  getAllCategorySlugs(): string[];
  getCategoryBySlug(slug: string): BlogCategory | undefined;
  getEntriesByCategory(slug: string): Promise<E[]>;
  /** Convert a CollectionEntry into a normalized BlogPostMetadata. */
  toMetadata(entry: E): BlogPostMetadata;
  categories: BlogCategory[];
}
