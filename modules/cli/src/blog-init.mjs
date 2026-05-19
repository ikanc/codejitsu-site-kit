import fs from 'fs';
import path from 'path';
import { c } from './format.mjs';

const PACKAGE_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..', '..', '..'
);

/**
 * `codejitsu blog:init` — copies the blog-writer slash command templates
 * into the site's `.claude/commands/`. The templates are thin references
 * to playbooks that live in the package; updates flow via `npm update`
 * without re-running this command.
 */
export async function runBlogInit() {
  const cwd = process.cwd();
  const dest = path.join(cwd, '.claude/commands');
  const src = path.join(
    PACKAGE_ROOT,
    'modules/blog-writer/templates/.claude/commands'
  );

  if (!fs.existsSync(src)) {
    console.error(c.red(`✗ Source dir missing: ${src}`));
    console.error('  Reinstall @ibalzam/codejitsu-core.');
    process.exit(1);
  }

  fs.mkdirSync(dest, { recursive: true });

  const files = fs.readdirSync(src).filter((n) => n.endsWith('.md'));
  console.log(c.bold('\nCodejitsu blog:init\n'));

  let written = 0;
  let skipped = 0;
  for (const name of files) {
    const destPath = path.join(dest, name);
    if (fs.existsSync(destPath)) {
      console.log(c.gray('= ') + `${name} (already exists, skipping)`);
      skipped++;
      continue;
    }
    fs.copyFileSync(path.join(src, name), destPath);
    console.log(c.green('+ ') + `.claude/commands/${name}`);
    written++;
  }

  console.log('');
  console.log(`${written} created, ${skipped} skipped.`);
  console.log('');

  // Detect whether blogWriter is already in the config.
  const configCandidates = ['codejitsu.config.ts', 'codejitsu.config.mjs', 'codejitsu.config.json'];
  let hasBlogWriter = false;
  for (const name of configCandidates) {
    const p = path.join(cwd, name);
    if (fs.existsSync(p) && /blogWriter\s*:/.test(fs.readFileSync(p, 'utf8'))) {
      hasBlogWriter = true;
      break;
    }
  }

  if (hasBlogWriter) {
    console.log(c.green('✓') + ' `blogWriter` block detected in codejitsu.config — ready to use.');
  } else {
    console.log(c.yellow('!') + ' No `blogWriter` block in codejitsu.config yet.');
    console.log('');
    console.log(c.gray('Add this minimal block to your codejitsu.config.ts:'));
    console.log('');
    console.log(c.gray('  blogWriter: {'));
    console.log(c.gray("    tone: 'professional, plain-spoken, confident not boastful',"));
    console.log(c.gray("    about: '<what the company does + who it serves>',"));
    console.log(c.gray("    audience: '<primary reader, e.g. BC homeowners ...>',"));
    console.log(c.gray("    services: ['Service A', 'Service B'],"));
    console.log(c.gray("    locations: ['City A', 'City B'],"));
    console.log(c.gray('    // Optional with kit defaults: approvedTags, wordCount, faqs,'));
    console.log(c.gray('    //   internalLinks, pricing, seasonalRules, bannedPhrases,'));
    console.log(c.gray('    //   authorDefault, cadenceDays, imageStyle'));
    console.log(c.gray('  },'));
    console.log('');
    console.log(c.gray('See node_modules/@ibalzam/codejitsu-core/modules/blog-writer/CLAUDE.md for the full shape.'));
  }

  console.log('');
  console.log('Then in Claude Code:');
  console.log('  /blog              single post, interactive');
  console.log('  /blog-batch 20     schedule + outline 20 future posts');
  console.log('  /blog-images       image prompts for pending posts');
  console.log('');
}
