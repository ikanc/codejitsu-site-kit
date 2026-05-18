#!/usr/bin/env node
import path from 'path';
import { loadConfig, isModuleEnabled } from '../../config/src/load.js';
import { generateLlms } from '../src/generate.mjs';

const cwd = process.cwd();

let config;
try {
  config = await loadConfig(cwd);
} catch (err) {
  console.error(`[codejitsu-llms] ${err.message}`);
  process.exit(1);
}

if (!isModuleEnabled(config, 'llms')) {
  console.log('[codejitsu-llms] llms module disabled; skipping.');
  process.exit(0);
}

await generateLlms({
  config,
  cwd,
  outDir: path.join(cwd, 'public'),
});
