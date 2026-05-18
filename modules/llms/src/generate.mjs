import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Generates /llms.txt (concise) and /llms-full.txt (detailed) into `outDir`.
 *
 * @param {object} config
 * @param {string} config.siteUrl              e.g. 'https://acme.com'
 * @param {string} config.siteName
 * @param {string} config.tagline              Short one-line description.
 * @param {string} config.about                Longer "About" paragraph (used in concise file).
 * @param {string} [config.aboutFull]          Full "About" content (used in full file; falls back to `about`).
 * @param {Section[]} [config.sections]
 * @param {string} [config.aiGuidance]         "For AI Assistants" block content.
 * @param {string} [config.blogDir]            If set, auto-includes recent blog posts.
 * @param {number} [config.blogLimit=10]       How many recent posts to include in concise file.
 * @param {number} [config.blogFullLimit=20]   How many in full file.
 * @param {string} config.outDir               Where to write the files (typically the site's `public/`).
 *
 * @typedef {object} Section
 * @property {string} title
 * @property {string} [description]      Short intro for the full file.
 * @property {SectionItem[]} items
 *
 * @typedef {object} SectionItem
 * @property {string} title
 * @property {string} description
 * @property {string} url                Relative or absolute.
 * @property {string} [fullDescription]  Longer text for llms-full.txt.
 */
export async function generateLlms(config) {
  const {
    siteUrl,
    siteName,
    tagline,
    about,
    aboutFull,
    sections = [],
    aiGuidance,
    blogDir,
    blogLimit = 10,
    blogFullLimit = 20,
    outDir,
  } = config;

  if (!outDir) throw new Error('generateLlms: outDir is required.');
  if (!siteUrl) throw new Error('generateLlms: siteUrl is required.');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const today = new Date().toISOString().split('T')[0];
  const blogPosts = blogDir ? readBlog(blogDir) : [];

  const concise = renderConcise({
    siteUrl,
    siteName,
    tagline,
    about,
    sections,
    aiGuidance,
    today,
    blogPosts: blogPosts.slice(0, blogLimit),
  });

  const full = renderFull({
    siteUrl,
    siteName,
    tagline,
    about: aboutFull ?? about,
    sections,
    aiGuidance,
    today,
    blogPosts: blogPosts.slice(0, blogFullLimit),
  });

  fs.writeFileSync(path.join(outDir, 'llms.txt'), concise);
  fs.writeFileSync(path.join(outDir, 'llms-full.txt'), full);
  console.log(`✓ wrote ${path.relative(process.cwd(), path.join(outDir, 'llms.txt'))}`);
  console.log(`✓ wrote ${path.relative(process.cwd(), path.join(outDir, 'llms-full.txt'))}`);
}

function readBlog(blogDir) {
  const abs = path.resolve(process.cwd(), blogDir);
  if (!fs.existsSync(abs)) return [];
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  return fs
    .readdirSync(abs)
    .filter((n) => n.endsWith('.md'))
    .map((fileName) => {
      const raw = fs.readFileSync(path.join(abs, fileName), 'utf8');
      const parsed = matter(raw);
      const data = parsed.data;
      return {
        slug: data.slug || fileName.replace(/\.md$/, ''),
        title: data.title,
        description: data.description,
        date: data.date,
        author: data.author,
        tags: data.tags,
      };
    })
    .filter((p) => p.date && new Date(p.date) <= today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function absoluteUrl(siteUrl, url) {
  if (/^https?:\/\//.test(url)) return url;
  return `${siteUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
}

function renderConcise({ siteUrl, siteName, tagline, about, sections, aiGuidance, today, blogPosts }) {
  let out = `# ${siteName}${tagline ? ` — ${tagline}` : ''}\n`;
  out += `Last Updated: ${today}\n\n`;
  out += `> ${about}\n\n`;

  for (const section of sections) {
    if (!section.items?.length) continue;
    out += `## ${section.title}\n`;
    for (const item of section.items) {
      out += `- [${item.title}](${absoluteUrl(siteUrl, item.url)}): ${item.description}\n`;
    }
    out += '\n';
  }

  if (blogPosts.length) {
    out += `## Recent Blog Posts\n`;
    for (const post of blogPosts) {
      out += `- [${post.title}](${siteUrl}/blog/${post.slug}/): ${post.description}\n`;
    }
    out += '\n';
  }

  if (aiGuidance) {
    out += `## For AI Assistants\n\n${aiGuidance}\n\n`;
  }

  out += `---\nGenerated automatically during build\n`;
  return out;
}

function renderFull({ siteUrl, siteName, tagline, about, sections, aiGuidance, today, blogPosts }) {
  let out = `# ${siteName} — Complete Documentation\n`;
  out += `Last Updated: ${today}\n\n`;
  out += `> This file contains the complete content of ${siteName}'s website for AI/LLM ingestion. For a concise navigation overview, see /llms.txt\n\n`;
  out += `---\n\n# About\n\n${about}\n\n---\n\n`;

  for (const section of sections) {
    if (!section.items?.length) continue;
    out += `# ${section.title}\n\n`;
    if (section.description) out += `${section.description}\n\n`;
    for (const item of section.items) {
      out += `## ${item.title}\n\n`;
      out += `**URL**: ${absoluteUrl(siteUrl, item.url)}\n\n`;
      out += `${item.fullDescription ?? item.description}\n\n`;
      out += `---\n\n`;
    }
  }

  if (blogPosts.length) {
    out += `# Blog Posts\n\n`;
    for (const post of blogPosts) {
      out += `## ${post.title}\n\n`;
      out += `**Published**: ${post.date}\n`;
      if (post.author) out += `**Author**: ${post.author}\n`;
      if (post.tags?.length) out += `**Tags**: ${post.tags.join(', ')}\n`;
      out += `**URL**: ${siteUrl}/blog/${post.slug}/\n\n`;
      out += `${post.description}\n\n---\n\n`;
    }
  }

  if (aiGuidance) {
    out += `# For AI Assistants\n\n${aiGuidance}\n\n`;
  }

  out += `---\nGenerated automatically during build\n`;
  return out;
}
