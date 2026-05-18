#!/usr/bin/env node
/**
 * Smoke checker for Codejitsu sites. Run from a site repo root after
 * `npm run build`. Verifies sitewide invariants from `checklist/core.md`
 * that can be checked programmatically.
 *
 * Exit code 0 = all checks pass.
 * Exit code 1 = at least one check failed (warnings still exit 0).
 *
 * Not exhaustive — visual/UX/content checks need human + Claude review.
 */
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const distDir = path.join(cwd, 'dist');

const checks = [];

function pass(name) {
  checks.push({ status: 'pass', name });
}
function warn(name, detail) {
  checks.push({ status: 'warn', name, detail });
}
function fail(name, detail) {
  checks.push({ status: 'fail', name, detail });
}

function exists(p) {
  return fs.existsSync(path.join(cwd, p));
}

function distHtmlFiles() {
  if (!fs.existsSync(distDir)) return [];
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

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

// ─── Pre-build files ─────────────────────────────────────────────────────

if (!exists('wrangler.toml')) fail('wrangler.toml present');
else pass('wrangler.toml present');

if (!exists('.github/workflows/daily-deploy.yml'))
  warn('.github/workflows/daily-deploy.yml present', 'Skip only if site has no scheduled content.');
else pass('.github/workflows/daily-deploy.yml present');

if (!exists('astro.config.mjs') && !exists('astro.config.ts'))
  fail('astro.config.{mjs,ts} present');
else {
  const cfg = readFile(
    path.join(cwd, exists('astro.config.ts') ? 'astro.config.ts' : 'astro.config.mjs')
  );
  if (!/trailingSlash:\s*['"]always['"]/.test(cfg))
    fail("trailingSlash: 'always' in astro.config", 'Required for canonical URL policy.');
  else pass("trailingSlash: 'always' in astro.config");

  if (!/output:\s*['"]static['"]/.test(cfg))
    fail("output: 'static' in astro.config");
  else pass("output: 'static' in astro.config");

  if (!/format:\s*['"]webp['"]/.test(cfg))
    warn("image.defaults.format: 'webp' in astro.config");
  else pass("image.defaults.format: 'webp' in astro.config");
}

// ─── Build artifacts ─────────────────────────────────────────────────────

if (!fs.existsSync(distDir)) {
  fail('dist/ exists', 'Run `npm run build` first.');
  printAndExit();
}
pass('dist/ exists');

const htmlFiles = distHtmlFiles();
if (htmlFiles.length === 0) fail('dist/ contains HTML files');
else pass(`dist/ contains ${htmlFiles.length} HTML files`);

const hasSitemap = fs.existsSync(path.join(distDir, 'sitemap-index.xml')) ||
  fs.existsSync(path.join(distDir, 'sitemap-0.xml'));
if (!hasSitemap) fail('sitemap-(index|0).xml in dist/');
else pass('sitemap in dist/');

if (!fs.existsSync(path.join(distDir, 'robots.txt'))) fail('dist/robots.txt');
else pass('dist/robots.txt');

if (!fs.existsSync(path.join(distDir, 'llms.txt'))) warn('dist/llms.txt');
else pass('dist/llms.txt');

if (!fs.existsSync(path.join(distDir, 'llms-full.txt'))) warn('dist/llms-full.txt');
else pass('dist/llms-full.txt');

// ─── Per-page checks ─────────────────────────────────────────────────────

const missingTitle = [];
const missingDescription = [];
const missingCanonical = [];
const missingOgImage = [];
const missingJsonLd = [];
const pngWhereWebp = [];
const placeholderText = [];

const webpSet = new Set();
(function walkAssets(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAssets(full);
    else if (entry.name.toLowerCase().endsWith('.webp')) {
      webpSet.add(path.relative(distDir, full).replace(/\.webp$/i, ''));
    }
  }
})(distDir);

const PLACEHOLDER_RE = /\b(lorem ipsum|TODO|FIXME|XXX:|placeholder)\b/i;

for (const file of htmlFiles) {
  const rel = path.relative(distDir, file);
  const html = readFile(file);

  if (!/<title>[^<]+<\/title>/.test(html)) missingTitle.push(rel);
  if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(html))
    missingDescription.push(rel);
  if (!/<link\s+rel=["']canonical["']\s+href=["'][^"']+["']/i.test(html))
    missingCanonical.push(rel);
  if (!/<meta\s+property=["']og:image["']\s+content=["'][^"']+["']/i.test(html))
    missingOgImage.push(rel);
  if (!/<script\s+type=["']application\/ld\+json["']/i.test(html))
    missingJsonLd.push(rel);

  // Find <img src="*.png|*.jpg"> and check if a .webp equivalent exists.
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+\.(?:png|jpe?g))["']/gi)) {
    const src = m[1].replace(/^\//, '');
    const noExt = src.replace(/\.(?:png|jpe?g)$/i, '');
    if (webpSet.has(noExt)) pngWhereWebp.push(`${rel} → ${m[1]}`);
  }

  if (PLACEHOLDER_RE.test(html)) placeholderText.push(rel);
}

function reportList(name, list, severity = 'fail') {
  if (list.length === 0) {
    pass(name);
    return;
  }
  const detail =
    list.length <= 5
      ? list.join(', ')
      : `${list.slice(0, 5).join(', ')} … (+${list.length - 5} more)`;
  (severity === 'fail' ? fail : warn)(name, detail);
}

reportList('Every page has <title>', missingTitle);
reportList('Every page has <meta description>', missingDescription);
reportList('Every page has canonical link', missingCanonical);
reportList('Every page has og:image', missingOgImage, 'warn');
reportList('Every page has JSON-LD schema', missingJsonLd);
reportList('No <img> references raw PNG/JPG where WebP exists', pngWhereWebp);
reportList('No placeholder text in production HTML', placeholderText);

// ─── Output ──────────────────────────────────────────────────────────────

printAndExit();

function printAndExit() {
  const passes = checks.filter((c) => c.status === 'pass').length;
  const warns = checks.filter((c) => c.status === 'warn').length;
  const fails = checks.filter((c) => c.status === 'fail').length;

  for (const c of checks) {
    const icon = c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✗';
    const line = `${icon} ${c.name}`;
    console.log(c.detail ? `${line}\n  ${c.detail}` : line);
  }
  console.log(`\n${passes} pass · ${warns} warn · ${fails} fail`);
  process.exit(fails > 0 ? 1 : 0);
}
