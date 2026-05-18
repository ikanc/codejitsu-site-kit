#!/usr/bin/env node
import path from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { optimizeImages } from '../src/optimize.mjs';

const cwd = process.cwd();
const configCandidates = [
  'codejitsu-images.config.mjs',
  'codejitsu-images.config.js',
];

const defaults = {
  sourceDir: path.join(cwd, 'public/images'),
  thumbDir: path.join(cwd, 'public/images/thumbs'),
  defaultQuality: 75,
  defaultMaxSize: 1200,
  thumbSize: 400,
  thumbQuality: 70,
  specialRules: {},
};

let userConfig = {};
for (const name of configCandidates) {
  const p = path.join(cwd, name);
  if (existsSync(p)) {
    userConfig = (await import(pathToFileURL(p).href)).default ?? {};
    console.log(`Loaded config: ${name}`);
    break;
  }
}

const config = {
  ...defaults,
  ...userConfig,
  sourceDir: userConfig.sourceDir
    ? path.resolve(cwd, userConfig.sourceDir)
    : defaults.sourceDir,
  thumbDir: userConfig.thumbDir
    ? path.resolve(cwd, userConfig.thumbDir)
    : defaults.thumbDir,
};

await optimizeImages(config);
