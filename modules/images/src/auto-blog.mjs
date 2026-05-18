import sharp from 'sharp';
import { readdir, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, parse } from 'path';

/**
 * Auto-process blog post images based on filename-as-slug convention.
 *
 * For every .md file in `contentDir`, looks for a matching source image
 * (`<slug>.png`, `<slug>.jpg`, `<slug>.jpeg`, `<slug>.webp`) in `sourceImageDir`.
 * If found, emits an optimized WebP to `<outputDir>/<slug>.webp`.
 *
 * Skips when the output is newer than the source (incremental builds).
 * Warns about slugs with no matching source image.
 *
 * @param {object} config
 * @param {string} config.contentDir       Where .md posts live, e.g. 'src/content/blog'.
 * @param {string} config.sourceImageDir   Where source images live (one per slug).
 * @param {string} config.outputDir        Where to write WebPs.
 * @param {number} config.width
 * @param {number|null} [config.height]    Null = preserve aspect ratio.
 * @param {number} [config.quality=82]
 */
export async function autoBlogImages(config) {
  const {
    contentDir,
    sourceImageDir,
    outputDir,
    width,
    height = null,
    quality = 82,
  } = config;

  if (!existsSync(contentDir)) {
    console.log(`autoBlogImages: contentDir ${contentDir} doesn't exist; skipping.`);
    return;
  }
  if (!existsSync(sourceImageDir)) {
    console.log(`autoBlogImages: sourceImageDir ${sourceImageDir} doesn't exist; skipping.`);
    return;
  }
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const slugs = await collectSlugs(contentDir);
  const exts = ['png', 'jpg', 'jpeg', 'webp'];

  let processed = 0;
  let skipped = 0;
  const missing = [];

  for (const slug of slugs) {
    let sourcePath = null;
    for (const ext of exts) {
      const candidate = join(sourceImageDir, `${slug}.${ext}`);
      if (existsSync(candidate)) {
        sourcePath = candidate;
        break;
      }
    }

    if (!sourcePath) {
      missing.push(slug);
      continue;
    }

    const outputPath = join(outputDir, `${slug}.webp`);

    if (existsSync(outputPath)) {
      const [srcStat, outStat] = await Promise.all([stat(sourcePath), stat(outputPath)]);
      if (outStat.mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        continue;
      }
    }

    const fit = height ? 'cover' : 'inside';
    await sharp(sourcePath)
      .resize(width, height, { fit, withoutEnlargement: true, position: 'center' })
      .webp({ quality, effort: 6 })
      .toFile(outputPath);
    console.log(`✓ ${slug}.webp (from ${parse(sourcePath).base}, q=${quality})`);
    processed++;
  }

  console.log(
    `autoBlogImages: ${processed} processed, ${skipped} up-to-date, ${missing.length} missing source.`
  );
  if (missing.length > 0) {
    console.warn('  Missing source images for slugs:');
    for (const slug of missing) console.warn(`    - ${slug}`);
    console.warn(
      `  Place an image named <slug>.{png,jpg,jpeg,webp} in ${sourceImageDir} to fix.`
    );
  }
}

async function collectSlugs(dir) {
  const slugs = [];
  async function walk(d) {
    for (const entry of await readdir(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) {
        slugs.push(entry.name.replace(/\.md$/, ''));
      }
    }
  }
  await walk(dir);
  return slugs;
}
