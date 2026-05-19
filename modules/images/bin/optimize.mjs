#!/usr/bin/env node
import path from 'path';
import { loadConfig, isModuleEnabled } from '../../config/src/load.mjs';
import { optimizeImages } from '../src/optimize.mjs';
import { autoBlogImages } from '../src/auto-blog.mjs';

const cwd = process.cwd();

let config;
try {
  config = await loadConfig(cwd);
} catch (err) {
  console.error(`[codejitsu-optimize-images] ${err.message}`);
  process.exit(1);
}

if (!isModuleEnabled(config, 'images')) {
  console.log('[codejitsu-optimize-images] images module disabled; skipping.');
  process.exit(0);
}

const images = config.images;

// 1. General recursive optimizer (if sourceDir configured).
if (images.sourceDir) {
  console.log(`[codejitsu-optimize-images] Scanning ${images.sourceDir}…`);
  await optimizeImages({
    sourceDir: path.resolve(cwd, images.sourceDir),
    thumbDir: images.thumbDir ? path.resolve(cwd, images.thumbDir) : null,
    defaultQuality: images.defaultQuality,
    defaultMaxSize: images.defaultMaxSize,
    thumbSize: images.thumbSize,
    thumbQuality: images.thumbQuality,
    specialRules: images.specialRules,
  });
}

// 2. Blog-image auto-processing (if configured).
if (images.autoBlogImages) {
  const a = images.autoBlogImages;
  console.log(`[codejitsu-optimize-images] Auto blog images: ${a.contentDir} → ${a.outputDir}`);
  await autoBlogImages({
    contentDir: path.resolve(cwd, a.contentDir),
    sourceImageDir: path.resolve(cwd, a.sourceImageDir),
    outputDir: path.resolve(cwd, a.outputDir),
    width: a.width,
    height: a.height,
    quality: a.quality,
  });
}

console.log('[codejitsu-optimize-images] Done.');
