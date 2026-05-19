import { pass, fail, warn, info, summarize } from '../util.mjs';

/**
 * HTTP-tier audit. Hits a live URL (production or staging) and verifies:
 *   - HTTPS + HTTP→HTTPS redirect
 *   - Security headers
 *   - 404 behavior (custom styled page, correct status)
 *   - Broken internal links (bounded same-origin crawl)
 *
 * Uses Node's native fetch (no deps). Caller supplies the base URL.
 */
export async function runHttp(ctx) {
  const { liveUrl } = ctx;
  if (!liveUrl) return [];

  const results = [];
  const base = new URL(liveUrl);
  const origin = base.origin;

  // ─── SSL / HTTP→HTTPS ──────────────────────────────────────────────────
  if (base.protocol !== 'https:') {
    results.push(fail(`Base URL is not HTTPS: ${liveUrl}`));
  } else {
    results.push(pass('Base URL is HTTPS'));
    const httpUrl = `http://${base.host}${base.pathname}`;
    try {
      const r = await fetchWithTimeout(httpUrl, { redirect: 'manual' });
      if (r.status >= 300 && r.status < 400) {
        const location = r.headers.get('location') ?? '';
        if (location.startsWith('https://')) {
          results.push(pass(`HTTP → HTTPS redirect (${r.status} to ${location})`));
        } else {
          results.push(warn(`HTTP redirects but not to HTTPS`, `${r.status} → ${location}`));
        }
      } else {
        results.push(fail(`HTTP did not redirect (status ${r.status})`));
      }
    } catch (err) {
      results.push(warn(`Could not test HTTP→HTTPS redirect`, err.message));
    }
  }

  // ─── Security headers ──────────────────────────────────────────────────
  let homeResponse;
  try {
    homeResponse = await fetchWithTimeout(origin + '/');
  } catch (err) {
    results.push(fail(`Could not fetch ${origin}/`, err.message));
    return results;
  }

  if (!homeResponse.ok) {
    results.push(fail(`Homepage returned ${homeResponse.status}`));
  } else {
    results.push(pass(`Homepage returns ${homeResponse.status} ${homeResponse.statusText}`));
  }

  const headers = homeResponse.headers;
  const securityHeaders = [
    { key: 'strict-transport-security', label: 'HSTS', severity: 'fail' },
    { key: 'content-security-policy', label: 'Content-Security-Policy', severity: 'warn' },
    { key: 'x-frame-options', label: 'X-Frame-Options', severity: 'warn' },
    { key: 'x-content-type-options', label: 'X-Content-Type-Options (nosniff)', severity: 'warn' },
    { key: 'referrer-policy', label: 'Referrer-Policy', severity: 'warn' },
    { key: 'permissions-policy', label: 'Permissions-Policy', severity: 'info' },
  ];

  for (const h of securityHeaders) {
    const value = headers.get(h.key);
    if (value) {
      results.push(pass(`${h.label}: ${value.slice(0, 70)}${value.length > 70 ? '…' : ''}`));
    } else if (h.severity === 'fail') {
      results.push(fail(`${h.label} header missing`));
    } else if (h.severity === 'warn') {
      results.push(warn(`${h.label} header missing`));
    } else {
      results.push(info(`${h.label} header missing`));
    }
  }

  // ─── 404 behavior ──────────────────────────────────────────────────────
  const probe = `${origin}/__codejitsu_audit_probe_${Date.now()}/`;
  try {
    const r = await fetchWithTimeout(probe);
    if (r.status === 404) {
      results.push(pass('Unknown URL returns 404'));
      const body = await r.text();
      const branded =
        /pearl|workzen|veteran|profix|codejitsu/i.test(body) ||
        body.includes('<head>') && body.length > 1000;
      results.push(branded
        ? pass('404 page is styled/branded')
        : warn('404 page returned but may be unstyled', `Body size: ${body.length} bytes`));
    } else {
      results.push(fail(`Unknown URL returned ${r.status} (expected 404)`));
    }
  } catch (err) {
    results.push(warn('Could not test 404 behavior', err.message));
  }

  // ─── Broken-link crawl (bounded) ───────────────────────────────────────
  const crawlResults = await crawl(origin, 30);
  if (crawlResults.broken.length === 0) {
    results.push(pass(`Crawled ${crawlResults.visited} pages — no broken links`));
  } else {
    results.push(fail(
      `${crawlResults.broken.length} broken links (crawled ${crawlResults.visited} pages)`,
      crawlResults.broken
    ));
  }
  if (crawlResults.redirected.length > 0) {
    results.push(warn(
      `${crawlResults.redirected.length} internal redirects (prefer direct links)`,
      crawlResults.redirected.slice(0, 5)
    ));
  }

  return results;
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, headers: { 'User-Agent': 'codejitsu-audit/0.5' } });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Bounded same-origin crawl. Starts at `origin/`, follows internal links
 * (extracted from <a href>), stops at `max` pages. Returns broken links
 * (4xx/5xx) and redirects encountered along the way.
 */
async function crawl(origin, max) {
  const visited = new Set();
  const queue = [origin + '/'];
  const broken = [];
  const redirected = [];

  while (queue.length > 0 && visited.size < max) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    let response;
    try {
      response = await fetchWithTimeout(url, { redirect: 'manual' });
    } catch (err) {
      broken.push(`${url}: ${err.message}`);
      continue;
    }

    if (response.status >= 400) {
      broken.push(`${url}: ${response.status}`);
      continue;
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';
      redirected.push(`${url} → ${response.status} → ${location}`);
      continue;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) continue;

    const body = await response.text();
    for (const m of body.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
      try {
        const absolute = new URL(m[1], url).toString();
        if (!absolute.startsWith(origin)) continue;          // external
        if (absolute.includes('#')) continue;                 // skip anchors
        if (/\.(?:webp|png|jpe?g|svg|pdf|woff2?|ico|css|js)(?:\?|$)/i.test(absolute)) continue;
        if (!visited.has(absolute) && queue.length + visited.size < max) {
          queue.push(absolute);
        }
      } catch {
        // skip invalid URLs
      }
    }
  }

  return { visited: visited.size, broken, redirected };
}
