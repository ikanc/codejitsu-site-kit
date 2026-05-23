import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import matter from 'gray-matter';
import { loadConfig, isModuleEnabled } from '../../config/src/load.mjs';
import { c } from './format.mjs';

const PACKAGE_PLAYBOOK = '@ibalzam/codejitsu-core/modules/blog-writer/BLOG_WRITING.md';

/**
 * `codejitsu blog:selftest [--topic "..."] [--model sonnet]`
 *
 * Spawns a COLD `claude -p` session (no memory of the kit's design), points
 * it at the blog-writer playbook, has it write a throwaway post, then grades
 * the output against the playbook's own rules. Reports pass/fail and deletes
 * the test post. Report-only: exits 1 on failure (CI-friendly) but blocks
 * nothing by default.
 *
 * This is the antidote to self-test bias — a fresh session reveals whether
 * the playbook actually drives behaviour, not whether the author follows
 * rules they already know.
 */
export async function runBlogSelftest({ topic, model = 'sonnet' } = {}) {
  const cwd = process.cwd();

  let config;
  try { config = await loadConfig(cwd); }
  catch (err) {
    console.error(c.red(`✗ ${err.message}`));
    process.exit(1);
  }

  if (!isModuleEnabled(config, 'blogWriter')) {
    console.error(c.red('✗ blogWriter not configured in codejitsu.config.'));
    console.error('  Run `codejitsu blog:init` and add the blogWriter block first.');
    process.exit(1);
  }
  const bw = config.blogWriter;

  if (!(await commandExists('claude'))) {
    console.error(c.red('✗ `claude` CLI not in PATH. Install Claude Code to run selftest.'));
    process.exit(1);
  }

  // Default topic: weave service[0] + location[0] so internal links are possible.
  const svc = bw.services?.[0] ?? 'your main service';
  const loc = bw.locations?.[0] ?? 'your main city';
  const testTopic = topic ?? `${svc} considerations for ${loc} homeowners this season`;

  const slug = `__selftest-${Date.now()}`;
  const contentDir = path.resolve(cwd, (typeof config.blog === 'object' && config.blog.contentDir) || 'src/content/blog');
  const postPath = path.join(contentDir, `${slug}.md`);

  console.log(c.bold(`\nCodejitsu blog:selftest\n`));
  console.log(`Model:  ${model}`);
  console.log(`Topic:  ${testTopic}`);
  console.log(`Output: ${path.relative(cwd, postPath)} (deleted after grading)`);
  console.log(c.gray('\nSpawning a cold claude -p session… (~$0.80 on sonnet, 2-6 minutes)\n'));

  const prompt = buildPrompt({ testTopic, slug });

  let envelope;
  try {
    const out = await runCmd('claude', [
      '-p', prompt,
      '--allowedTools', 'Read Glob Grep Write Edit Bash',
      '--model', model,
      '--output-format', 'json',
    ], 600_000);
    if (out.code !== 0) {
      console.error(c.red(`✗ claude exited ${out.code}`));
      console.error(out.stderr.slice(0, 400));
      cleanup(postPath);
      process.exit(1);
    }
    envelope = JSON.parse(out.stdout);
  } catch (err) {
    console.error(c.red(`✗ Could not run claude: ${err.message}`));
    cleanup(postPath);
    process.exit(1);
  }

  if (envelope.total_cost_usd) {
    console.log(c.gray(`Cost: ~$${Number(envelope.total_cost_usd).toFixed(3)}\n`));
  }

  if (!fs.existsSync(postPath)) {
    console.error(c.red(`✗ Cold Claude did not write the expected file: ${path.relative(cwd, postPath)}`));
    console.error(c.gray('Its response was:'));
    console.error(c.gray((envelope.result ?? '').slice(0, 500)));
    process.exit(1);
  }

  const results = gradePost(postPath, bw);
  printGrade(results);
  cleanup(postPath);

  const fails = results.filter((r) => r.status === 'fail').length;
  console.log('');
  console.log(fails === 0
    ? c.green('Selftest passed — the playbook drove a clean post from a cold session.')
    : c.red(`Selftest found ${fails} failure(s) — tighten the playbook and re-run.`));
  process.exit(fails > 0 ? 1 : 0);
}

function buildPrompt({ testTopic, slug }) {
  return `You are running the /blog command for this Codejitsu site. Open ${PACKAGE_PLAYBOOK} (in node_modules) and follow it top-down to write ONE blog post.

This is a NON-INTERACTIVE selftest run. SKIP the AskUserQuestion step and use:
- Topic: ${testTopic}
- Pick the post type + length tier that genuinely fit the topic
- Use the next sensible future publish date
- IMPORTANT: write the file to exactly this slug so it can be graded + cleaned up:
  src/content/blog/${slug}.md

Read codejitsu.config.ts for tone, services, locations, approvedTags, and all rules. Read src/content.config.ts for the taxonomy fields. Read ONE existing post to match the frontmatter SHAPE (but write the body in clean markdown, and use only approvedTags for category + tags). Run the playbook's Step 4 verify checks and fix any failures before finishing.`;
}

function gradePost(postPath, bw) {
  const raw = fs.readFileSync(postPath, 'utf8');
  let data, body;
  try {
    const parsed = matter(raw);
    data = parsed.data;
    body = parsed.content;
  } catch (err) {
    return [{ status: 'fail', label: 'Frontmatter parses', detail: err.message }];
  }

  const results = [];
  const add = (ok, label, detail) =>
    results.push({ status: ok ? 'pass' : 'fail', label, detail: ok ? undefined : detail });
  const addWarn = (ok, label, detail) =>
    results.push({ status: ok ? 'pass' : 'warn', label, detail: ok ? undefined : detail });

  // Em dashes
  const emDashes = (body.match(/[—–]/g) ?? []).length;
  add(emDashes === 0, 'No em dashes', `found ${emDashes}`);

  // No H1 in body
  const firstLine = body.split('\n').find((l) => l.trim().length > 0) ?? '';
  add(!/^#\s/.test(firstLine.trim()), 'No H1 in body', `body starts with: ${firstLine.slice(0, 50)}`);

  // Markdown body, not HTML
  add(!/^\s*<(p|h[1-6]|div|ul|ol|table)[\s>]/i.test(body.trimStart()),
    'Body is markdown (not HTML)', 'body starts with an HTML block tag');

  // FAQ count
  const faqMin = bw.faqs?.min ?? 5;
  const faqMax = bw.faqs?.max ?? 8;
  const faqCount = Array.isArray(data.faqs) ? data.faqs.length : 0;
  add(faqCount >= faqMin && faqCount <= faqMax,
    `FAQ count in ${faqMin}-${faqMax}`, `got ${faqCount}`);

  // Tags governance
  const approved = new Set(bw.approvedTags ?? []);
  if (approved.size > 0) {
    const used = [];
    if (typeof data.category === 'string') used.push(data.category);
    if (Array.isArray(data.tags)) used.push(...data.tags);
    const bad = [...new Set(used.filter((t) => !approved.has(t)))];
    add(bad.length === 0, 'All tags/category in approvedTags',
      `not approved: ${bad.join(', ')}`);
  } else {
    results.push({ status: 'warn', label: 'approvedTags configured', detail: 'none set' });
  }

  // Internal links
  const linkMin = bw.internalLinks?.min ?? 3;
  const links = (body.match(/\]\(\/(services|service-areas)\/[^)]+\)/g) ?? []).length;
  addWarn(links >= linkMin, `Internal links ≥ ${linkMin}`, `got ${links}`);

  // Banned phrases
  const banned = bw.bannedPhrases ?? ["In today's fast-paced world", 'When it comes to', 'Look no further', 'In conclusion'];
  const hit = banned.filter((p) => body.toLowerCase().includes(p.toLowerCase()));
  add(hit.length === 0, 'No banned phrases', `found: ${hit.join('; ')}`);

  // At least one list or table
  const hasList = /^[-*]\s/m.test(body) || /^\d+\.\s/m.test(body) || /^\|.+\|/m.test(body);
  add(hasList, 'At least one list or table', 'none found');

  // Word count sane (not absurdly thin)
  const words = body.split(/\s+/).filter(Boolean).length;
  addWarn(words >= 700, 'Body ≥ 700 words (not thin)', `got ${words}`);
  results.push({ status: 'info', label: `Body word count: ${words}` });

  // Pricing brackets (only if brackets-only)
  if (bw.pricing === 'brackets-only') {
    // Heuristic: flag standalone $N that is NOT part of a "$N - $N" range or a narrative.
    // We only hard-check the count; narrative examples are allowed, so this is a warn.
    const standalone = (body.match(/\$[0-9][0-9,]*(?!\s*-\s*\$)/g) ?? []).length;
    results.push({ status: 'info', label: `Standalone $ figures: ${standalone} (narrative examples allowed; service-cost claims should be ranges)` });
  }

  return results;
}

function printGrade(results) {
  console.log(c.bold('Grade:'));
  for (const r of results) {
    const icon = r.status === 'pass' ? c.green('✓')
      : r.status === 'warn' ? c.yellow('!')
      : r.status === 'info' ? c.gray('i')
      : c.red('✗');
    console.log(`  ${icon} ${r.label}${r.detail ? c.gray('  — ' + r.detail) : ''}`);
  }
}

function cleanup(postPath) {
  try { if (fs.existsSync(postPath)) fs.unlinkSync(postPath); } catch {}
}

function commandExists(cmd) {
  return new Promise((resolve) => {
    const p = spawn('which', [cmd], { stdio: 'ignore' });
    p.on('close', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
  });
}

function runCmd(cmd, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });
    const t = setTimeout(() => { proc.kill(); reject(new Error('timed out')); }, timeoutMs);
    proc.on('error', (e) => { clearTimeout(t); reject(e); });
    proc.on('close', (code) => { clearTimeout(t); resolve({ code, stdout, stderr }); });
  });
}
