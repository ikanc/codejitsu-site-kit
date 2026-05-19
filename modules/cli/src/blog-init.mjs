import fs from 'fs';
import path from 'path';
import { c } from './format.mjs';

const PACKAGE_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..', '..', '..'
);

/**
 * `codejitsu blog:init` — copies the blog-writer slash command templates
 * into the site's `.claude/commands/` directory. The templates are thin
 * references to playbooks that live in the package, so site updates flow
 * via `npm update` without re-running this command.
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
  console.log('Next: configure the `blogWriter` block in codejitsu.config.ts.');
  console.log('See `node_modules/@ibalzam/codejitsu-core/modules/blog-writer/CLAUDE.md`.');
  console.log('');
  console.log('Then in Claude Code:');
  console.log('  /blog              single post, interactive');
  console.log('  /blog-batch 20     schedule + outline 20 future posts');
  console.log('  /blog-images       image prompts for pending posts');
}
