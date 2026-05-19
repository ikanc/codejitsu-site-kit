#!/usr/bin/env node
import { runBlog } from '../modules/cli/src/blog.mjs';

const subcommand = process.argv[2];

const COMMANDS = {
  'blog:list': () => runBlog('blog:list'),
  'blog:drafts': () => runBlog('blog:drafts'),
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
  console.log(`\nUsage: codejitsu <subcommand>\n`);
  console.log(`Subcommands:`);
  console.log(`  blog:list           List every non-draft post with publish status + URL + image check`);
  console.log(`  blog:drafts         List future-dated (pending) posts only`);
  console.log(``);
  console.log(`  llms                Generate public/llms.txt and public/llms-full.txt`);
  console.log(`  optimize-images     Optimize images per codejitsu.config`);
  console.log(`  check               Run sitewide checklist`);
  console.log(``);
  console.log(`All commands read codejitsu.config.{ts,mjs,json} from the current directory.`);
}
