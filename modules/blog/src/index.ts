import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface BlogPostFrontmatter {
  title: string;
  description: string;
  date: string;
  slug?: string;
  author?: string;
  image?: string;
  tags?: string[];
  faqs?: FAQItem[];
}

export interface BlogPostMetadata {
  slug: string;
  title: string;
  description: string;
  date: string;
  author?: string;
  image?: string;
  tags?: string[];
  readingTime: string;
}

export interface BlogPost extends BlogPostMetadata {
  faqs?: FAQItem[];
  content: string;
}

export interface BlogCategory {
  slug: string;
  tag: string;
  title: string;
  subtitle: string;
  metaDescription: string;
}

export interface BlogConfig {
  contentDir?: string;
  defaultAuthor?: string;
  categories?: BlogCategory[];
}

export interface BlogAPI {
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

function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function fileSlug(name: string): string {
  return name.replace(/\.md$/, '');
}

function canonicalSlugFor(name: string, fm: { slug?: string }): string {
  return fm.slug || fileSlug(name);
}

export function createBlog(config: BlogConfig = {}): BlogAPI {
  const contentDir = path.resolve(process.cwd(), config.contentDir ?? 'content/blog');
  const defaultAuthor = config.defaultAuthor;
  const categories = config.categories ?? [];

  function readAllFiles() {
    if (!fs.existsSync(contentDir)) return [];
    return fs.readdirSync(contentDir)
      .filter((n) => n.endsWith('.md'))
      .map((fileName) => {
        const raw = fs.readFileSync(path.join(contentDir, fileName), 'utf8');
        const parsed = matter(raw);
        const data = parsed.data as Partial<BlogPostFrontmatter>;
        return {
          fileName,
          fileSlug: fileSlug(fileName),
          canonicalSlug: canonicalSlugFor(fileName, data),
          data,
          content: parsed.content,
        };
      });
  }

  function toMetadata(f: ReturnType<typeof readAllFiles>[number]): BlogPostMetadata {
    return {
      slug: f.canonicalSlug,
      title: f.data.title ?? '',
      description: f.data.description ?? '',
      date: f.data.date ?? '',
      author: f.data.author ?? defaultAuthor,
      image: f.data.image,
      tags: f.data.tags,
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
      if (!f.data.date) continue;
      if (new Date(f.data.date) > today) {
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
      faqs: match.data.faqs,
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
