import fs from 'fs';
import path from 'path';
import { pass, fail, warn, info } from '../util.mjs';

const AI_BOTS = [
  'GPTBot',          // OpenAI
  'ClaudeBot',       // Anthropic
  'PerplexityBot',   // Perplexity
  'CCBot',           // Common Crawl (used by many AI training pipelines)
  'Google-Extended', // Google (Bard / Gemini)
];

export async function runAi(ctx) {
  const { distDir } = ctx;
  const results = [];

  const robotsPath = path.join(distDir, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    results.push(warn('robots.txt missing — cannot check AI bot rules'));
    return results;
  }

  const robots = fs.readFileSync(robotsPath, 'utf8');
  const mentioned = AI_BOTS.filter((bot) =>
    new RegExp(`User-agent:\\s*${bot}`, 'i').test(robots)
  );

  if (mentioned.length === 0) {
    results.push(info(
      'robots.txt has no explicit AI crawler rules',
      'Default = allow. Add `User-agent: GPTBot` (etc.) with Allow/Disallow if you want explicit control.'
    ));
  } else {
    results.push(pass(`robots.txt mentions AI bots: ${mentioned.join(', ')}`));
  }

  // llms.txt presence checked in structure.mjs; here check content quality.
  const llmsPath = path.join(distDir, 'llms.txt');
  if (fs.existsSync(llmsPath)) {
    const llms = fs.readFileSync(llmsPath, 'utf8');
    const lines = llms.split('\n');
    const headings = lines.filter((l) => l.startsWith('## ')).length;
    results.push(
      headings >= 3
        ? pass(`llms.txt has ${headings} sections`)
        : warn(`llms.txt has only ${headings} sections — consider expanding`)
    );
  }

  return results;
}
