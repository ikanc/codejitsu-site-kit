import { pass, fail, warn, info } from '../util.mjs';

const PROVIDERS = [
  { key: 'ga4',       label: 'GA4',            pattern: /G-[A-Z0-9]{6,}/, },
  { key: 'gtm',       label: 'GTM',            pattern: /GTM-[A-Z0-9]{6,}/, },
  { key: 'googleAds', label: 'Google Ads',     pattern: /AW-\d{8,}/, },
  { key: 'ahrefs',    label: 'Ahrefs',         pattern: /analytics\.ahrefs\.com\/analytics\.js/, },
  { key: 'hotjar',    label: 'Hotjar',         pattern: /static\.hotjar\.com\/c\/hotjar-/, },
];

const VERIFICATION = [
  { key: 'googleSearchConsole', label: 'Google Search Console',
    pattern: /<meta\s+name=["']google-site-verification["']/ },
  { key: 'bingWebmaster',       label: 'Bing Webmaster',
    pattern: /<meta\s+name=["']msvalidate\.01["']/ },
];

export async function runAnalytics(ctx) {
  const { htmlFiles, config } = ctx;
  const results = [];
  const auditCfg = config.audit ?? {};
  const analyticsCfg = auditCfg.analytics ?? {};
  const verificationCfg = auditCfg.verification ?? {};

  // Sample the homepage; analytics scripts should be on every page, but checking
  // one is enough — they're usually injected via a layout component.
  const home = htmlFiles.find((f) => f.relPath === 'index.html') ?? htmlFiles[0];

  for (const provider of PROVIDERS) {
    const present = provider.pattern.test(home.content);
    const requirement = analyticsCfg[provider.key] ?? 'optional';

    if (requirement === 'required') {
      results.push(present ? pass(`${provider.label} installed`) : fail(`${provider.label} required but not found`));
    } else if (requirement === 'banned') {
      results.push(present ? fail(`${provider.label} found but banned in config`) : pass(`${provider.label} not present (as configured)`));
    } else {
      // optional
      results.push(present ? pass(`${provider.label} installed`) : info(`${provider.label} not installed`));
    }
  }

  for (const v of VERIFICATION) {
    const present = v.pattern.test(home.content);
    const required = verificationCfg[v.key] === true;
    if (required) {
      results.push(present ? pass(`${v.label} verification tag`) : fail(`${v.label} verification tag missing`));
    } else {
      results.push(present ? pass(`${v.label} verification tag`) : info(`${v.label} verification tag not present`));
    }
  }

  return results;
}
