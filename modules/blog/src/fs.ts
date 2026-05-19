import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type {
  BlogFsAPI,
  BlogCategory,
  BlogPost,
  BlogPostMetadata,
  CommonBlogConfig,
} from './types.js';

export interface FsBlogConfig extends CommonBlogConfig {
  /** Directory of .md files (relative to cwd). Default 'content/blog'. */
  contentDir?: string;
}

function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function fileSlug(name: string): string {
  return name.replace(/\.md$/, '');
}

function asISO(value: unknown): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value;
  return '';
}

/**
 * Markdown + gray-matter blog loader. Reads .md files directly from disk.
 * Use this for non-Astro projects, or Astro projects that don't want Content Collections.
 *
 * For Astro projects with Content Collections (recommended), use `createBlogFromCollection`.
 */
export function createBlog(config: FsBlogConfig = {}): BlogFsAPI {
  const contentDir = path.resolve(process.cwd(), config.contentDir ?? 'content/blog');
  const defaultAuthor = config.defaultAuthor;
  const categories = config.categories ?? [];
  const dateField = config.dateField ?? 'date';
  const draftField = config.draftField ?? null;

  function readAllFiles() {
    if (!fs.existsSync(contentDir)) return [];
    return fs
      .readdirSync(contentDir)
      .filter((n) => n.endsWith('.md'))
      .map((fileName) => {
        const raw = fs.readFileSync(path.join(contentDir, fileName), 'utf8');
        const parsed = matter(raw);
        const data = parsed.data as Record<string, unknown>;
        const slug = (data.slug as string | undefined) || fileSlug(fileName);
        return {
          fileName,
          fileSlug: fileSlug(fileName),
          canonicalSlug: slug,
          data,
          content: parsed.content,
        };
      })
      .filter((f) => (draftField ? !f.data[draftField] : true));
  }

  function toMetadata(f: ReturnType<typeof readAllFiles>[number]): BlogPostMetadata {
    return {
      slug: f.canonicalSlug,
      title: (f.data.title as string) ?? '',
      description: (f.data.description as string) ?? '',
      date: asISO(f.data[dateField]),
      author: (f.data.author as string) ?? defaultAuthor,
      image: f.data.image as string | undefined,
      tags: f.data.tags as string[] | undefined,
      readingTime: readingTime(f.content).text,
    };
  }

  async function getAllPostsIncludingFuture(): Promise<BlogPostMetadata[]> {
    return readAllFiles()
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
    const slugs = new Set<string>();
    for (const f of readAllFiles()) {
      const date = asISO(f.data[dateField]);
      if (!date) continue;
      if (new Date(date) > today) {
        slugs.add(f.canonicalSlug);
        if (f.fileSlug !== f.canonicalSlug) slugs.add(f.fileSlug);
      }
    }
    return Array.from(slugs);
  }

  async function getAllPostSlugs(): Promise<string[]> {
    const slugs = new Set<string>();
    for (const f of readAllFiles()) {
      slugs.add(f.fileSlug);
      if (f.canonicalSlug !== f.fileSlug) slugs.add(f.canonicalSlug);
    }
    return Array.from(slugs);
  }

  async function getPostBySlug(slug: string): Promise<BlogPost | null> {
    const match = readAllFiles().find(
      (f) => f.canonicalSlug === slug || f.fileSlug === slug
    );
    if (!match) return null;
    return {
      ...toMetadata(match),
      faqs: match.data.faqs as BlogPost['faqs'],
      content: match.content,
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
