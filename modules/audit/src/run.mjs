import fs from 'fs';
import path from 'path';
import { loadConfig, isModuleEnabled } from '../../config/src/load.mjs';
import { c } from '../../cli/src/format.mjs';
import { runStructure } from './groups/structure.mjs';
import { runLinks } from './groups/links.mjs';
import { runSeo } from './groups/seo.mjs';
import { runAi } from './groups/ai-discoverability.mjs';
import { runAnalytics } from './groups/analytics.mjs';
import { runForms } from './groups/forms.mjs';
import { runContent } from './groups/content.mjs';
import { runPerformance } from './groups/performance.mjs';
import { runBlogQuality } from './groups/blog-quality.mjs';
import { runHttp } from './http/runner.mjs';
import { runA11y } from './a11y/runner.mjs';
import { runAi as runAiTier } from './ai/runner.mjs';

/**
 * Pre-delivery audit. Static (against dist/) + optional tiers:
 *   --live <url>   Hits the URL for security headers, redirects, 404, broken links.
 *   --a11y         Runs axe-core against --live URL (requires @axe-core/cli).
 *
 * Reads codejitsu.config for module enablement + audit preferences.
 *
 * @param {object} [opts]
 * @param {string} [opts.liveUrl]
 * @param {boolean} [opts.a11y]
 */
export async function runAudit(opts = {}) {
  const cwd = process.cwd();
  const distDir = path.join(cwd, 'dist');

  let config;
  try {
    config = await loadConfig(cwd);
  } catch (err) {
    console.error(c.red('✗ No codejitsu.config found.'));
    console.error('  Run `codejitsu audit` from a Codejitsu site root.');
    process.exit(1);
  }

  if (!fs.existsSync(distDir)) {
    console.error(c.red('✗ No dist/ directory.'));
    console.error('  Run `npm run build` first.');
    process.exit(1);
  }

  // Index HTML files once; pass to all check groups.
  const htmlFiles = collectHtmlFiles(distDir).map((file) => ({
    relPath: path.relative(distDir, file),
    fullPath: file,
    content: fs.readFileSync(file, 'utf8'),
  }));

  // Index public assets for cross-reference checks.
  const webpSet = new Set();
  collectAssets(distDir).forEach((p) => {
    if (p.toLowerCase().endsWith('.webp')) {
      webpSet.add(path.relative(distDir, p).replace(/\.webp$/i, ''));
    }
  });

  const ctx = {
    cwd,
    distDir,
    config,
    htmlFiles,
    webpSet,
    liveUrl: opts.liveUrl ?? null,
    a11y: opts.a11y ?? false,
    ai: opts.ai ?? false,
    enabled: {
      blog: isModuleEnabled(config, 'blog'),
      seo: isModuleEnabled(config, 'seo'),
      images: isModuleEnabled(config, 'images'),
      llms: isModuleEnabled(config, 'llms'),
      deploy: isModuleEnabled(config, 'deploy'),
    },
  };

  const groups = [
    { name: 'Structure & Build', run: runStructure },
    { name: 'Links & URLs', run: runLinks },
    { name: 'SEO', run: runSeo },
    { name: 'AI Discoverability', run: runAi },
    { name: 'Analytics & Tags', run: runAnalytics },
    { name: 'Forms', run: runForms },
    { name: 'Content & A11y', run: runContent },
    { name: 'Performance', run: runPerformance },
    { name: 'Blog Quality', run: runBlogQuality },
  ];
  if (ctx.liveUrl) {
    groups.push({ name: `Live HTTP (${ctx.liveUrl})`, run: runHttp });
  }
  if (ctx.a11y) {
    groups.push({ name: 'Accessibility (axe-core WCAG 2.1 AA)', run: runA11y });
  }
  if (ctx.ai) {
    groups.push({ name: 'AI content review (claude -p)', run: runAiTier });
  }

  console.log(c.bold(`\nCodejitsu Audit · ${config.site.name} (${htmlFiles.length} pages)\n`));

  let totals = { pass: 0, warn: 0, fail: 0, info: 0 };

  for (const group of groups) {
    const results = await group.run(ctx);
    if (!results || results.length === 0) continue;
    console.log(c.bold(`◉ ${group.name}`));
    for (const r of results) {
      printResult(r);
      totals[r.status] = (totals[r.status] ?? 0) + 1;
    }
    console.log('');
  }

  const summary =
    `${c.green(totals.pass + ' pass')}  ` +
    `${c.yellow(totals.warn + ' warn')}  ` +
    `${c.red(totals.fail + ' fail')}` +
    (totals.info ? `  ${c.gray(totals.info + ' info')}` : '');
  console.log(summary);

  if (totals.fail > 0) process.exit(1);
}

function printResult(r) {
  const icon =
    r.status === 'pass' ? c.green('✓') :
    r.status === 'warn' ? c.yellow('!') :
    r.status === 'info' ? c.gray('i') :
    c.red('✗');
  console.log(`  ${icon} ${r.label}`);
  if (r.detail) {
    const lines = Array.isArray(r.detail) ? r.detail : [r.detail];
    for (const line of lines.slice(0, 5)) {
      console.log(`    ${c.gray(line)}`);
    }
    if (lines.length > 5) {
      console.log(`    ${c.gray(`… (+${lines.length - 5} more)`)}`);
    }
  }
}

function collectHtmlFiles(distDir) {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) out.push(full);
    }
  })(distDir);
  return out;
}

function collectAssets(distDir) {
  const out = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  })(distDir);
  return out;
}
