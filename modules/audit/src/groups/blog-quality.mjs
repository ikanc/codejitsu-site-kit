import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { pass, fail, warn, info, summarize } from '../util.mjs';

export async function runBlogQuality(ctx) {
  const { cwd, config, enabled } = ctx;
  if (!enabled.blog) return [];

  const blogCfg = config.blog && typeof config.blog === 'object' ? config.blog : {};
  const contentDir = path.resolve(cwd, blogCfg.contentDir ?? 'src/content/blog');
  const dateField = blogCfg.dateField ?? 'date';
  const draftField = blogCfg.draftField ?? null;

  if (!fs.existsSync(contentDir)) {
    return [info('Blog content directory not found', `Looked at: ${contentDir}`)];
  }

  const results = [];
  const auditCfg = config.audit ?? {};
  const staleMonths = auditCfg.blog?.staleMonths ?? 12;

  const files = fs.readdirSync(contentDir).filter((n) => n.endsWith('.md'));
  if (files.length === 0) {
    results.push(info('No blog posts found'));
    return results;
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const staleCutoff = new Date(today);
  staleCutoff.setUTCMonth(staleCutoff.getUTCMonth() - staleMonths);

  const stalePosts = [];
  const missingDescription = [];
  const missingImage = [];
  const shortBody = [];
  const dupTitle = new Map();
  const dupDesc = new Map();

  for (const fileName of files) {
    const raw = fs.readFileSync(path.join(contentDir, fileName), 'utf8');
    const { data, content } = matter(raw);
    if (draftField && data[draftField]) continue;

    const slug = fileName.replace(/\.md$/, '');
    const dateVal = data[dateField];
    const postDate = dateVal instanceof Date ? dateVal : (typeof dateVal === 'string' ? new Date(dateVal) : null);

    if (postDate && postDate < staleCutoff) {
      stalePosts.push(`${slug} (${postDate.toISOString().split('T')[0]})`);
    }
    if (!data.description || data.description.length < 50) {
      missingDescription.push(slug);
    }
    if (!data.image) missingImage.push(slug);
    if (content.length < 800) shortBody.push(`${slug} (${content.length} chars)`);

    if (data.title) {
      const list = dupTitle.get(data.title) ?? [];
      list.push(slug);
      dupTitle.set(data.title, list);
    }
    if (data.description) {
      const list = dupDesc.get(data.description) ?? [];
      list.push(slug);
      dupDesc.set(data.description, list);
    }
  }

  results.push(info(`${files.length} blog posts indexed`));
  results.push(summarize(
    `No posts older than ${staleMonths} months`,
    stalePosts,
    'warn'
  ));
  results.push(summarize('Posts have a description (≥ 50 chars)', missingDescription));
  results.push(summarize('Posts have an image', missingImage, 'warn'));
  results.push(summarize('Posts have substantial body (≥ 800 chars)', shortBody, 'warn'));

  const dupTitles = [...dupTitle.entries()].filter(([, ps]) => ps.length > 1);
  results.push(
    dupTitles.length === 0
      ? pass('Blog post titles are unique')
      : warn(`${dupTitles.length} duplicate post titles`,
          dupTitles.map(([t, ps]) => `"${t.slice(0, 50)}" → ${ps.join(', ')}`))
  );

  const dupDescs = [...dupDesc.entries()].filter(([, ps]) => ps.length > 1);
  results.push(
    dupDescs.length === 0
      ? pass('Blog post descriptions are unique')
      : warn(`${dupDescs.length} duplicate post descriptions`,
          dupDescs.map(([d, ps]) => `"${d.slice(0, 50)}..." → ${ps.join(', ')}`))
  );

  return results;
}
