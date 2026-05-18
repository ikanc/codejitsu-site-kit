import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, parse, relative } from 'path';

/**
 * General recursive PNG/JPG → WebP optimizer.
 *
 * Walks `sourceDir` recursively. For every .jpg/.jpeg/.png, emits a .webp sibling.
 * Per-file overrides via `specialRules`. Optional thumbnail generation.
 *
 * @param {object} config
 * @param {string} config.sourceDir
 * @param {string|null} [config.thumbDir]    Null = no thumbs.
 * @param {number} [config.defaultQuality=75]
 * @param {number} [config.defaultMaxSize=1200]
 * @param {number} [config.thumbSize=400]
 * @param {number} [config.thumbQuality=70]
 * @param {Record<string, SpecialRule>} [config.specialRules]
 *   Key = path relative to sourceDir without extension (e.g. 'logos/logo').
 */
export async function optimizeImages(config) {
  const {
    sourceDir,
    thumbDir = null,
    defaultQuality = 75,
    defaultMaxSize = 1200,
    thumbSize = 400,
    thumbQuality = 70,
    specialRules = {},
  } = config;

  if (!existsSync(sourceDir)) {
    console.log(`No source dir at ${sourceDir} — nothing to optimize.`);
    return;
  }

  const generateThumbs = thumbDir && thumbDir !== sourceDir;
  if (generateThumbs && !existsSync(thumbDir)) {
    await mkdir(thumbDir, { recursive: true });
  }

  async function processDir(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (generateThumbs && fullPath === thumbDir) continue;
        await processDir(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const lower = entry.name.toLowerCase();
      if (!/\.(jpe?g|png)$/.test(lower)) continue;

      const { name } = parse(entry.name);
      const relPath = relative(sourceDir, fullPath);
      const ruleKey = relPath.replace(/\.(jpe?g|png)$/i, '');
      const rule = specialRules[ruleKey];

      const outputDir = dirname(fullPath);
      const webpPath = join(outputDir, `${name}.webp`);

      const maxWidth = rule?.maxWidth ?? defaultMaxSize;
      const maxHeight = rule?.maxHeight ?? defaultMaxSize;
      const quality = rule?.quality ?? defaultQuality;
      const smartSubsample = rule?.smartSubsample ?? false;

      let pipeline = sharp(fullPath);
      if (maxWidth || maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      await pipeline.webp({ quality, effort: 6, smartSubsample }).toFile(webpPath);
      console.log(`✓ ${relPath} → ${name}.webp (q=${quality})`);

      if (rule?.generateAvif) {
        const avifPath = join(outputDir, `${name}.avif`);
        await sharp(fullPath)
          .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
          .avif({ quality, effort: 6 })
          .toFile(avifPath);
        console.log(`  + ${name}.avif`);
      }

      if (rule?.optimizePng && lower.endsWith('.png')) {
        const buffer = await sharp(fullPath)
          .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
          .png({ quality, compressionLevel: 9, palette: true })
          .toBuffer();
        await sharp(buffer).toFile(fullPath);
        console.log(`  ↻ optimized PNG in place`);
      }

      if (generateThumbs) {
        const thumbOutputDir = join(thumbDir, dirname(relPath));
        if (!existsSync(thumbOutputDir)) {
          await mkdir(thumbOutputDir, { recursive: true });
        }
        await sharp(fullPath)
          .resize(thumbSize, thumbSize, { fit: 'cover', position: 'center' })
          .webp({ quality: thumbQuality, effort: 6 })
          .toFile(join(thumbOutputDir, `${name}.webp`));
      }
    }
  }

  await processDir(sourceDir);
}
