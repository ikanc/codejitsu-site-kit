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
  /** Additional fields. */
  [key: string]: unknown;
}

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
  /** Raw markdown body (fs mode) or rendered HTML (CC mode). See per-function notes. */
  content: string;
}

export interface BlogCategory {
  slug: string;
  tag: string;
  title: string;
  subtitle: string;
  metaDescription: string;
}

export interface BlogAPI {
  /** Published posts only (date <= today, not draft). Sorted newest first. */
  getAllPosts(): Promise<BlogPostMetadata[]>;
  /** All non-draft posts including future-dated ones. Sorted newest first. */
  getAllPostsIncludingFuture(): Promise<BlogPostMetadata[]>;
  /** Slugs of non-draft posts with a future date. */
  getFutureBlogSlugs(): Promise<string[]>;
  /** Every slug needed for static path generation (includes future-dated, excludes drafts). */
  getAllPostSlugs(): Promise<string[]>;
  getPostBySlug(slug: string): Promise<BlogPost | null>;
  getAllTags(): Promise<string[]>;
  getPostsByTag(tag: string): Promise<BlogPostMetadata[]>;
  getAllCategorySlugs(): string[];
  getCategoryBySlug(slug: string): BlogCategory | undefined;
  getPostsByCategory(slug: string): Promise<BlogPostMetadata[]>;
  categories: BlogCategory[];
}

export interface CommonBlogConfig {
  defaultAuthor?: string;
  categories?: BlogCategory[];
  /** Frontmatter field name for the date. Default 'date'. */
  dateField?: string;
  /** Frontmatter field name for the draft flag. Default null (no draft support). */
  draftField?: string | null;
}
