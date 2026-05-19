import fs from 'fs';
import path from 'path';
import { pass, fail, warn, info } from '../util.mjs';

export async function runStructure(ctx) {
  const { cwd, distDir, htmlFiles, enabled } = ctx;
  const results = [];

  results.push(info(`${htmlFiles.length} HTML pages built`));

  const hasSitemap =
    fs.existsSync(path.join(distDir, 'sitemap-index.xml')) ||
    fs.existsSync(path.join(distDir, 'sitemap-0.xml'));
  results.push(hasSitemap ? pass('Sitemap present') : fail('Sitemap missing in dist/'));

  const robotsPath = path.join(distDir, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    results.push(fail('robots.txt missing'));
  } else {
    results.push(pass('robots.txt present'));
    const robots = fs.readFileSync(robotsPath, 'utf8');
    results.push(
      /Sitemap:\s*https?:\/\//i.test(robots)
        ? pass('robots.txt references sitemap')
        : warn('robots.txt does not reference sitemap')
    );
  }

  results.push(
    fs.existsSync(path.join(distDir, '404.html'))
      ? pass('Custom 404 page (dist/404.html)')
      : warn('No custom 404 page (dist/404.html)')
  );

  if (enabled.llms) {
    results.push(
      fs.existsSync(path.join(distDir, 'llms.txt'))
        ? pass('llms.txt present')
        : warn('llms.txt missing (llms module is enabled)')
    );
    results.push(
      fs.existsSync(path.join(distDir, 'llms-full.txt'))
        ? pass('llms-full.txt present')
        : warn('llms-full.txt missing (llms module is enabled)')
    );
  }

  if (enabled.deploy) {
    results.push(
      fs.existsSync(path.join(cwd, 'wrangler.toml'))
        ? pass('wrangler.toml at site root')
        : fail('wrangler.toml missing')
    );
    results.push(
      fs.existsSync(path.join(cwd, '.github/workflows/daily-deploy.yml'))
        ? pass('Daily deploy workflow present')
        : warn('No .github/workflows/daily-deploy.yml')
    );
  }

  // Astro config sanity + trailing-slash plugin agreement
  const astroCfgPath =
    fs.existsSync(path.join(cwd, 'astro.config.ts'))
      ? path.join(cwd, 'astro.config.ts')
      : fs.existsSync(path.join(cwd, 'astro.config.mjs'))
        ? path.join(cwd, 'astro.config.mjs')
        : null;
  if (astroCfgPath) {
    const astroCfg = fs.readFileSync(astroCfgPath, 'utf8');

    const trailingSlashAlways = /trailingSlash:\s*['"]always['"]/.test(astroCfg);
    results.push(
      trailingSlashAlways
        ? pass("astro.config: trailingSlash: 'always'")
        : fail("astro.config missing trailingSlash: 'always'")
    );

    results.push(
      /output:\s*['"]static['"]/.test(astroCfg)
        ? pass("astro.config: output: 'static'")
        : fail("astro.config missing output: 'static'")
    );

    // Trailing-slash plugin: if astro.config enforces 'always', the rehype
    // plugin should also be wired so markdown hrefs get auto-fixed. The audit
    // catches violations either way, but the plugin prevents them entering dist/.
    if (trailingSlashAlways) {
      const hasPlugin =
        /@ibalzam\/codejitsu-core\/rehype\/trailing-slash/.test(astroCfg) ||
        /rehype.*[Tt]railing[Ss]lash/.test(astroCfg);
      results.push(
        hasPlugin
          ? pass('rehype/trailing-slash plugin wired into markdown')
          : info(
              'No trailing-slash rehype plugin detected',
              'Add @ibalzam/codejitsu-core/rehype/trailing-slash to astro.config markdown.rehypePlugins to auto-fix /foo → /foo/ in markdown.'
            )
      );
    }
  } else {
    results.push(fail('astro.config.{ts,mjs} missing'));
  }

  return results;
}
