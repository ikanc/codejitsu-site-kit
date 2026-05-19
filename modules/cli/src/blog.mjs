import fs from 'fs';
import path from 'path';
import { loadConfig, isModuleEnabled } from '../../config/src/load.mjs';
import { createBlog } from '../../blog/src/fs.js';
import { c, table } from './format.mjs';

/**
 * `codejitsu blog:list` — show every non-draft post (published + pending).
 * `codejitsu blog:drafts` — show only future-dated (pending) posts.
 */
export async function runBlog(subcommand) {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  if (!isModuleEnabled(config, 'blog')) {
    console.error(c.red('blog module is disabled in codejitsu.config'));
    process.exit(1);
  }

  const blogCfg = config.blog && typeof config.blog === 'object' ? config.blog : {};
  const contentDir = blogCfg.contentDir ?? 'src/content/blog';
  const dateField = blogCfg.dateField ?? 'date';
  const draftField = blogCfg.draftField ?? null;

  const blog = createBlog({
    contentDir,
    dateField,
    draftField,
  });

  const today = todayUTC();
  const siteUrl = config.site.url.replace(/\/$/, '');

  if (subcommand === 'blog:drafts') {
    const future = await blog.getAllPostsIncludingFuture();
    const drafts = future.filter((p) => new Date(p.date) > today);
    printPosts(drafts, { siteUrl, contentDir, today, kind: 'drafts' });
    return;
  }

  // blog:list — published + pending, sorted newest first
  const all = await blog.getAllPostsIncludingFuture();
  printPosts(all, { siteUrl, contentDir, today, kind: 'all' });
}

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysBetween(future, today) {
  return Math.round((future.getTime() - today.getTime()) / 86_400_000);
}

function printPosts(posts, { siteUrl, contentDir, today, kind }) {
  if (posts.length === 0) {
    console.log(c.dim(kind === 'drafts' ? 'No pending posts.' : 'No posts.'));
    return;
  }

  const cwd = process.cwd();
  const publicDir = path.join(cwd, 'public');

  const rows = posts.map((p) => {
    const postDate = new Date(p.date);
    const isFuture = postDate > today;
    const days = isFuture ? `+${daysBetween(postDate, today)}d` : 'live';

    const url = `${siteUrl}/blog/${p.slug}/`;
    const imgStatus = formatImageStatus(p.image, publicDir);

    return [
      isFuture ? c.yellow(days) : c.green(days),
      p.date,
      imgStatus,
      url,
    ];
  });

  table(['STATUS', 'DATE', 'IMG', 'URL'], rows);

  const published = posts.filter((p) => new Date(p.date) <= today).length;
  const pending = posts.length - published;
  console.log('');
  console.log(
    `${c.bold(String(posts.length))} posts · ` +
      `${c.green(`${published} live`)} · ` +
      `${c.yellow(`${pending} pending`)}`
  );
}

function formatImageStatus(image, publicDir) {
  if (!image) return c.gray('—');
  const rel = image.startsWith('/') ? image.slice(1) : image;
  const fullPath = path.join(publicDir, rel);
  if (fs.existsSync(fullPath)) return c.green('✓');
  return c.red(`✗ ${image}`);
}

