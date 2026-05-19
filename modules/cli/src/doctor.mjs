import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { c } from './format.mjs';

const PACKAGE_NAME = '@ibalzam/codejitsu-core';

// Curated list of deps where being current matters most. We check ALL deps,
// but these get extra treatment in the output (changelog links, severity).
const CRITICAL_DEPS = new Set([
  '@ibalzam/codejitsu-core',
  'astro',
  'react',
  'react-dom',
  '@astrojs/react',
  '@astrojs/sitemap',
  'tailwindcss',
  '@tailwindcss/vite',
  'typescript',
]);

/**
 * `codejitsu doctor` — health-check the project's dependency versions vs
 * what's currently published on npm. Catches "Claude scaffolded with stale
 * versions from training data" mistakes before they ship.
 */
export async function runDoctor() {
  const cwd = process.cwd();
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error(c.red('✗ No package.json in ' + cwd));
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  console.log(c.bold(`\nCodejitsu Doctor · ${pkg.name ?? '(unnamed)'}\n`));

  // ─── Node version ────────────────────────────────────────────────────
  const nodeVersion = process.versions.node;
  const nodeMajor = parseInt(nodeVersion.split('.')[0], 10);
  // Node LTS schedule: even majors. Active LTS = most recent even major.
  // Conservative recommendation: 20 LTS or newer. (Reads schedule from API
  // would be ideal but adds latency; static threshold is fine.)
  const minRecommended = 20;
  console.log(c.bold('◉ Runtime'));
  if (nodeMajor >= minRecommended) {
    console.log('  ' + c.green('✓') + ` Node v${nodeVersion}`);
  } else {
    console.log('  ' + c.yellow('!') + ` Node v${nodeVersion} — recommend ≥ v${minRecommended} LTS`);
  }
  console.log('');

  // ─── npm outdated ────────────────────────────────────────────────────
  console.log(c.bold('◉ Dependencies'));
  console.log(c.gray('  Running npm outdated… (this hits the registry, may take a few seconds)'));
  console.log('');

  const result = await runCmd('npm', ['outdated', '--json'], 60_000);
  // npm outdated exits 1 when anything is outdated; that's expected.
  let outdated = {};
  if (result.stdout.trim()) {
    try { outdated = JSON.parse(result.stdout); }
    catch {
      console.log('  ' + c.yellow('!') + ' Could not parse npm outdated output');
      console.log('  ' + c.gray(result.stdout.slice(0, 200)));
    }
  }

  const entries = Object.entries(outdated);

  if (entries.length === 0) {
    console.log('  ' + c.green('✓') + ' All dependencies up to date');
  } else {
    const critical = entries.filter(([name]) => CRITICAL_DEPS.has(name));
    const others = entries.filter(([name]) => !CRITICAL_DEPS.has(name));

    if (critical.length > 0) {
      console.log(c.bold('  Critical:'));
      for (const [name, info] of critical) {
        printDep(name, info, true);
      }
      console.log('');
    }

    if (others.length > 0) {
      console.log(c.bold('  Other:'));
      for (const [name, info] of others.slice(0, 10)) {
        printDep(name, info, false);
      }
      if (others.length > 10) {
        console.log(c.gray(`    … (+${others.length - 10} more)`));
      }
      console.log('');
    }
  }

  // ─── codejitsu-core specifically ─────────────────────────────────────
  const cjEntry = outdated[PACKAGE_NAME];
  if (cjEntry) {
    console.log(c.bold('◉ ' + PACKAGE_NAME));
    console.log(`  Installed: ${cjEntry.current}`);
    console.log(`  Latest:    ${cjEntry.latest}`);
    console.log(c.gray(`  Upgrade:   npm install ${PACKAGE_NAME}@latest`));
    console.log(c.gray(`  Changelog: https://github.com/ikanc/codejitsu-site-kit/releases`));
  } else if (pkg.dependencies?.[PACKAGE_NAME] || pkg.devDependencies?.[PACKAGE_NAME]) {
    console.log(c.bold('◉ ' + PACKAGE_NAME));
    console.log('  ' + c.green('✓') + ' On latest');
  }
  console.log('');

  // ─── Tips ─────────────────────────────────────────────────────────────
  if (entries.length > 0) {
    console.log(c.gray('Tip: bump the critical deps first, then re-run `npx codejitsu doctor`.'));
    console.log(c.gray('     A major-version jump (e.g. Astro 5 → 6) needs a migration guide; check the package changelog.'));
  }
}

function printDep(name, info, isCritical) {
  const { current, latest, wanted } = info;
  const arrow = isCritical ? c.yellow('→') : c.gray('→');
  const nameDisplay = isCritical ? c.bold(name) : name;
  const currentDisplay = current === wanted ? current : c.dim(`${current} (npm install gets ${wanted})`);
  console.log(`    ${nameDisplay.padEnd(40)} ${currentDisplay}  ${arrow}  ${c.bold(latest)}`);
}

function runCmd(cmd, args, timeoutMs = 60_000) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    const t = setTimeout(() => { proc.kill(); resolve({ code: 1, stdout, stderr: 'timeout' }); }, timeoutMs);
    proc.on('close', (code) => { clearTimeout(t); resolve({ code, stdout, stderr }); });
    proc.on('error', (err) => { clearTimeout(t); resolve({ code: 1, stdout, stderr: err.message }); });
  });
}
