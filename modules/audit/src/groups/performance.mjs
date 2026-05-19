import { pass, fail, warn, info, summarize } from '../util.mjs';

export async function runPerformance(ctx) {
  const { htmlFiles, config } = ctx;
  const auditCfg = config.audit ?? {};
  const perfCfg = auditCfg.performance ?? {};
  const results = [];

  // Defaults — these are advisory thresholds, not standards.
  const INLINE_SCRIPT_BUDGET = perfCfg.inlineScriptBudgetBytes ?? 200_000;
  const INLINE_STYLE_BUDGET = perfCfg.inlineStyleBudgetBytes ?? 100_000;
  const SCRIPT_TAG_BUDGET = perfCfg.scriptTagBudget ?? 15;

  const imgsNoSize = [];
  const imgsHaveLoadingEager = [];
  const imgsBelowFoldNotLazy = [];
  const oversizedScripts = [];
  const oversizedStyles = [];
  const tooManyScripts = [];
  const noFontPreload = [];

  for (const f of htmlFiles) {
    // <img> dimensions for CLS
    for (const m of f.content.matchAll(/<img[^>]*>/gi)) {
      const tag = m[0];
      const hasWidth = /\swidth=/.test(tag);
      const hasHeight = /\sheight=/.test(tag);
      if (!hasWidth || !hasHeight) {
        const src = tag.match(/src=["']([^"']+)["']/)?.[1] ?? '?';
        // Astro's <Image> auto-emits dimensions; raw <img> doesn't. We only
        // flag if BOTH are missing.
        if (!hasWidth && !hasHeight) imgsNoSize.push(`${f.relPath}: ${src}`);
      }
    }

    // Lazy-loading heuristic: only the first <img> per page should be eager
    // (the LCP candidate). Everything else should be loading="lazy".
    const imgs = [...f.content.matchAll(/<img[^>]*>/gi)].map((m) => m[0]);
    imgs.forEach((tag, idx) => {
      const isLazy = /loading=["']lazy["']/.test(tag);
      const isEager = /loading=["']eager["']/.test(tag);
      const src = tag.match(/src=["']([^"']+)["']/)?.[1] ?? '?';

      if (idx === 0) {
        // First image is OK eager (it's likely the hero).
        // If it's lazy, that hurts LCP — flag.
        if (isLazy) imgsBelowFoldNotLazy.push(`${f.relPath}: first img is lazy (LCP risk): ${src}`);
      } else {
        // Subsequent images should be lazy.
        if (!isLazy && !isEager) imgsBelowFoldNotLazy.push(`${f.relPath}: below-fold img not lazy: ${src}`);
      }
    });

    // Inline <script> total size + count
    let inlineScriptSize = 0;
    let scriptTagCount = 0;
    for (const m of f.content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
      scriptTagCount++;
      inlineScriptSize += m[1].length;
    }
    // External scripts too
    scriptTagCount += [...f.content.matchAll(/<script[^>]+src=["'][^"']+["'][^>]*>/gi)].length;

    if (inlineScriptSize > INLINE_SCRIPT_BUDGET) {
      oversizedScripts.push(`${f.relPath}: ${(inlineScriptSize / 1024).toFixed(1)} KB inline`);
    }
    if (scriptTagCount > SCRIPT_TAG_BUDGET) {
      tooManyScripts.push(`${f.relPath}: ${scriptTagCount} <script> tags`);
    }

    // Inline <style> total size
    let inlineStyleSize = 0;
    for (const m of f.content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
      inlineStyleSize += m[1].length;
    }
    if (inlineStyleSize > INLINE_STYLE_BUDGET) {
      oversizedStyles.push(`${f.relPath}: ${(inlineStyleSize / 1024).toFixed(1)} KB inline`);
    }

    // Font preload (look for <link rel="preload" as="font">)
    const hasFontPreload = /<link\s+rel=["']preload["'][^>]+as=["']font["']/.test(f.content);
    if (!hasFontPreload) noFontPreload.push(f.relPath);
  }

  results.push(summarize('All <img> have width/height attrs (CLS)', dedupe(imgsNoSize), 'warn'));
  results.push(summarize('Below-fold <img> use loading="lazy"', dedupe(imgsBelowFoldNotLazy), 'warn'));
  results.push(summarize(
    `Inline <script> ≤ ${(INLINE_SCRIPT_BUDGET / 1024).toFixed(0)} KB per page`,
    dedupe(oversizedScripts),
    'warn'
  ));
  results.push(summarize(
    `Inline <style> ≤ ${(INLINE_STYLE_BUDGET / 1024).toFixed(0)} KB per page`,
    dedupe(oversizedStyles),
    'warn'
  ));
  results.push(summarize(
    `≤ ${SCRIPT_TAG_BUDGET} <script> tags per page`,
    dedupe(tooManyScripts),
    'warn'
  ));

  // Font preload — high-value but easy to miss. Info only (don't fail).
  if (noFontPreload.length === htmlFiles.length) {
    results.push(info('No font preload found on any page', 'Consider <link rel="preload" as="font" type="font/woff2" crossorigin> for LCP gains.'));
  } else if (noFontPreload.length > 0) {
    results.push(info(`${noFontPreload.length}/${htmlFiles.length} pages without font preload`));
  } else {
    results.push(pass('Every page preloads at least one font'));
  }

  return results;
}

function dedupe(arr) {
  return Array.from(new Set(arr)).slice(0, 20);
}
