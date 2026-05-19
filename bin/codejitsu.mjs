#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { runBlog } from '../modules/cli/src/blog.mjs';
import { runAudit } from '../modules/audit/src/run.mjs';

const subcommand = process.argv[2];
const rest = process.argv.slice(3);

const COMMANDS = {
  'blog:list': () => runBlog('blog:list'),
  'blog:drafts': () => runBlog('blog:drafts'),
  audit: () => {
    const { values } = parseArgs({
      args: rest,
      options: {
        live: { type: 'string' },
        a11y: { type: 'boolean' },
        ai: { type: 'boolean' },
      },
      allowPositionals: true,
    });
    return runAudit({ liveUrl: values.live, a11y: values.a11y, ai: values.ai });
  },
  // Aliases for the existing standalone bins
  llms: () => import('../modules/llms/bin/generate.mjs'),
  'optimize-images': () => import('../modules/images/bin/optimize.mjs'),
  check: () => import('../checklist/bin/run.mjs'),
};

if (!subcommand || subcommand === '--help' || subcommand === '-h') {
  printHelp();
  process.exit(0);
}

const handler = COMMANDS[subcommand];
if (!handler) {
  console.error(`Unknown subcommand: ${subcommand}\n`);
  printHelp();
  process.exit(1);
}

try {
  await handler();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

function printHelp() {
  console.log(`\nUsage: codejitsu <subcommand> [flags]\n`);
  console.log(`Subcommands:`);
  console.log(`  blog:list           List every non-draft post with URL + image check`);
  console.log(`  blog:drafts         List future-dated (pending) posts only`);
  console.log(``);
  console.log(`  audit               Run pre-delivery audit. Flags:`);
  console.log(`    --live <url>      Add live-URL checks (SSL, headers, 404, broken links)`);
  console.log(`    --a11y            Add axe-core WCAG 2.1 AA scan (with --live)`);
  console.log(`    --ai              Add Claude-powered content audit (uses 'claude -p')`);
  console.log(``);
  console.log(`  llms                Generate public/llms.txt and public/llms-full.txt`);
  console.log(`  optimize-images     Optimize images per codejitsu.config`);
  console.log(`  check               Run minimal pre-build checklist`);
  console.log(``);
  console.log(`All commands read codejitsu.config.{ts,mjs,json} from the current directory.`);
}
