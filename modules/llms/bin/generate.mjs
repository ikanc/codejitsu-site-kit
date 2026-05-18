#!/usr/bin/env node
import path from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { generateLlms } from '../src/generate.mjs';

const cwd = process.cwd();
const candidates = ['codejitsu-llms.config.mjs', 'codejitsu-llms.config.js'];

let configPath = null;
for (const name of candidates) {
  const p = path.join(cwd, name);
  if (existsSync(p)) {
    configPath = p;
    break;
  }
}

if (!configPath) {
  console.error('No codejitsu-llms.config.mjs found in current directory.');
  console.error('Copy the template from node_modules/@ibalzam/codejitsu-core/modules/llms/templates/');
  process.exit(1);
}

const userConfig = (await import(pathToFileURL(configPath).href)).default;

await generateLlms({
  ...userConfig,
  outDir: userConfig.outDir
    ? path.resolve(cwd, userConfig.outDir)
    : path.join(cwd, 'public'),
  blogDir: userConfig.blogDir
    ? path.resolve(cwd, userConfig.blogDir)
    : undefined,
});
