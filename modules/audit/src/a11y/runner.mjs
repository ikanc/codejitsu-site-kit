import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pass, fail, warn, info } from '../util.mjs';

/**
 * Accessibility audit via `@axe-core/cli`. Spawns the CLI against the live URL,
 * parses its JSON report, and groups violations by impact (critical / serious /
 * moderate / minor) for the audit summary.
 *
 * Requires either:
 *   - `@axe-core/cli` installed in the site (`npm install -D @axe-core/cli`), or
 *   - network access for npx to fetch it on demand.
 *
 * Uses real headless Chrome (via Puppeteer, bundled by @axe-core/cli) so the
 * test reflects WCAG 2.1 AA verdicts on the rendered page (not raw HTML).
 */
export async function runA11y(ctx) {
  const { liveUrl } = ctx;
  if (!liveUrl) {
    return [info('a11y skipped — provide --live <url> to enable')];
  }

  const reportFile = path.join(os.tmpdir(), `codejitsu-axe-${Date.now()}.json`);
  const reportDir = path.dirname(reportFile);

  let stderr = '';
  let exitCode;
  try {
    const result = await runCmd('npx', [
      '--yes',
      '@axe-core/cli',
      liveUrl,
      '--dir', reportDir,
      '--save', path.basename(reportFile),
      '--exit',
    ]);
    exitCode = result.code;
    stderr = result.stderr;
  } catch (err) {
    return [warn('Could not run @axe-core/cli', String(err.message ?? err))];
  }

  // Find the file axe wrote. The --save option names it; --dir specifies its dir.
  let parsed;
  try {
    if (!fs.existsSync(reportFile)) {
      // axe sometimes writes a slightly different filename. Try the dir.
      const candidates = fs.readdirSync(reportDir).filter((n) => n.startsWith('codejitsu-axe-') && n.endsWith('.json'));
      if (candidates.length === 0) {
        return [warn('axe-core ran but produced no JSON report', stderr.slice(0, 400) || `exit code: ${exitCode}`)];
      }
      const newest = candidates.map((n) => path.join(reportDir, n)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
      parsed = JSON.parse(fs.readFileSync(newest, 'utf8'));
    } else {
      parsed = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    }
  } catch (err) {
    return [warn('Could not parse axe-core JSON output', err.message)];
  }

  const results = [];
  // axe report is an array of per-URL test results.
  const reports = Array.isArray(parsed) ? parsed : [parsed];

  // Aggregate counts.
  const violationsByImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const ruleHits = new Map();         // rule id → { impact, help, count, exampleUrl }
  let totalPasses = 0;
  let totalIncomplete = 0;

  for (const r of reports) {
    totalPasses += (r.passes ?? []).length;
    totalIncomplete += (r.incomplete ?? []).length;

    for (const v of r.violations ?? []) {
      const impact = v.impact ?? 'moderate';
      violationsByImpact[impact] = (violationsByImpact[impact] ?? 0) + (v.nodes?.length ?? 1);
      const existing = ruleHits.get(v.id);
      if (existing) {
        existing.count += v.nodes?.length ?? 1;
      } else {
        ruleHits.set(v.id, {
          impact,
          help: v.help,
          helpUrl: v.helpUrl,
          count: v.nodes?.length ?? 1,
          exampleUrl: r.url ?? liveUrl,
        });
      }
    }
  }

  const totalViolations = Object.values(violationsByImpact).reduce((a, b) => a + b, 0);

  results.push(info(
    `axe-core checked ${reports.length} URL(s) — ${totalPasses} rules passed, ${totalViolations} violations, ${totalIncomplete} need manual review`
  ));

  // Per-impact severity buckets.
  const impactMap = [
    { key: 'critical', label: 'critical', sev: 'fail' },
    { key: 'serious',  label: 'serious',  sev: 'fail' },
    { key: 'moderate', label: 'moderate', sev: 'warn' },
    { key: 'minor',    label: 'minor',    sev: 'warn' },
  ];

  for (const { key, label, sev } of impactMap) {
    const count = violationsByImpact[key] ?? 0;
    if (count === 0) {
      results.push(pass(`No ${label} a11y violations`));
    } else {
      const examples = [...ruleHits.entries()]
        .filter(([, info]) => info.impact === key)
        .slice(0, 5)
        .map(([id, info]) => `${id} (×${info.count}) — ${info.help}`);
      const result = sev === 'fail' ? fail : warn;
      results.push(result(`${count} ${label} a11y violation${count === 1 ? '' : 's'}`, examples));
    }
  }

  return results;
}

function runCmd(cmd, args, timeoutMs = 180_000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    const t = setTimeout(() => {
      proc.kill();
      reject(new Error(`${cmd} timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
    proc.on('error', (err) => {
      clearTimeout(t);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(t);
      resolve({ code, stdout, stderr });
    });
  });
}
