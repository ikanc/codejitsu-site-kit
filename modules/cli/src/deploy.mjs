import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { loadConfig, isModuleEnabled } from '../../config/src/load.mjs';
import { c } from './format.mjs';

const PACKAGE_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..', '..', '..'
);

/**
 * `codejitsu deploy:setup` — interactive wizard for Cloudflare Pages + daily
 * deploy hook. Copies the workflow + wrangler templates, prompts for the
 * Cloudflare deploy hook URL, and stores it as a GitHub Actions secret.
 *
 * Idempotent: re-running with everything already in place is a no-op (just
 * verifies state).
 */
export async function runDeploySetup() {
  const cwd = process.cwd();

  let config;
  try { config = await loadConfig(cwd); }
  catch (err) {
    console.error(c.red('✗ No codejitsu.config found in ' + cwd));
    process.exit(1);
  }

  if (!isModuleEnabled(config, 'deploy')) {
    console.error(c.red('✗ deploy module is disabled in codejitsu.config'));
    process.exit(1);
  }

  console.log(c.bold('\nCodejitsu Deploy Setup\n'));

  // ─── Detect environment ──────────────────────────────────────────────
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    console.error(c.red('✗ Not a git repository. Initialise git first.'));
    process.exit(1);
  }

  const repo = detectGitHubRepo(cwd);
  if (!repo) {
    console.error(c.red('✗ Could not detect GitHub repo from git remote.'));
    console.error('  Set up: git remote add origin git@github.com:owner/name.git');
    process.exit(1);
  }
  console.log(c.green('✓') + ` GitHub repo: ${c.bold(repo)}`);

  const ghAvailable = await commandExists('gh');
  if (!ghAvailable) {
    console.error(c.red('✗ `gh` CLI not in PATH.'));
    console.error('  Install: https://cli.github.com/');
    process.exit(1);
  }
  const ghAuthed = await ghIsAuthed();
  if (!ghAuthed) {
    console.error(c.red('✗ `gh` not authenticated.'));
    console.error('  Run: gh auth login');
    process.exit(1);
  }
  console.log(c.green('✓') + ' gh CLI authenticated');

  const pagesName = config.deploy?.cloudflarePagesName;
  if (pagesName) console.log(c.green('✓') + ` Cloudflare Pages name: ${c.bold(pagesName)}`);
  else console.log(c.yellow('!') + ' No deploy.cloudflarePagesName in codejitsu.config (wrangler.toml will need a manual name)');

  // ─── Workflow + wrangler files ───────────────────────────────────────
  console.log('\nChecking files…');

  const workflowDest = path.join(cwd, '.github/workflows/daily-deploy.yml');
  const wranglerDest = path.join(cwd, 'wrangler.toml');

  if (fs.existsSync(workflowDest)) {
    console.log(c.green('✓') + ' .github/workflows/daily-deploy.yml exists');
  } else {
    const workflowSrc = path.join(PACKAGE_ROOT, 'modules/deploy/templates/daily-deploy.yml');
    fs.mkdirSync(path.dirname(workflowDest), { recursive: true });
    fs.copyFileSync(workflowSrc, workflowDest);
    console.log(c.green('+') + ' Created .github/workflows/daily-deploy.yml');
  }

  if (fs.existsSync(wranglerDest)) {
    console.log(c.green('✓') + ' wrangler.toml exists');
  } else {
    const wranglerSrc = path.join(PACKAGE_ROOT, 'modules/deploy/templates/wrangler.toml');
    let contents = fs.readFileSync(wranglerSrc, 'utf8');
    if (pagesName) contents = contents.replace('TODO-site-name', pagesName);
    fs.writeFileSync(wranglerDest, contents);
    console.log(c.green('+') + ' Created wrangler.toml' + (pagesName ? '' : ' (edit `name` field)'));
  }

  // ─── GitHub secret ───────────────────────────────────────────────────
  console.log('\nChecking GitHub Actions secrets…');
  const secrets = await listSecrets(repo);
  const hasSecret = secrets.includes('CLOUDFLARE_DEPLOY_HOOK_URL');

  if (hasSecret) {
    console.log(c.green('✓') + ' CLOUDFLARE_DEPLOY_HOOK_URL is set');
    const rotate = await prompt('\nRotate the deploy hook URL? [y/N]: ');
    if (!/^y(es)?$/i.test(rotate.trim())) {
      console.log(c.gray('\nNothing to do. The daily deploy is configured.\n'));
      await offerTestRun(repo);
      return;
    }
  }

  // Prompt for URL.
  console.log('');
  console.log('Get a deploy hook URL from Cloudflare Pages:');
  console.log(c.gray('  1. Open Cloudflare dashboard → Pages → ' + (pagesName ?? 'your project') + ' → Settings'));
  console.log(c.gray('  2. Builds & deployments → Deploy hooks → "Add deploy hook"'));
  console.log(c.gray('  3. Name: "daily-scheduled-content" — Branch: main'));
  console.log(c.gray('  4. Copy the URL'));
  console.log('');

  const url = (await prompt('Paste the deploy hook URL: ')).trim();
  if (!url.startsWith('https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/')) {
    console.error(c.red('\n✗ That doesn\'t look like a Cloudflare Pages deploy hook URL.'));
    console.error('  Expected prefix: https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/');
    process.exit(1);
  }

  const setOk = await setSecret(repo, 'CLOUDFLARE_DEPLOY_HOOK_URL', url);
  if (!setOk) {
    console.error(c.red('\n✗ Failed to set GitHub secret.'));
    process.exit(1);
  }
  console.log(c.green('✓') + ` Secret CLOUDFLARE_DEPLOY_HOOK_URL set in ${repo}`);

  await offerTestRun(repo);
}

async function offerTestRun(repo) {
  const test = await prompt('\nTrigger the workflow once now to test? [y/N]: ');
  if (!/^y(es)?$/i.test(test.trim())) {
    console.log(c.gray('\nDone. Daily deploy fires at 13:00 UTC (06:00 PDT / 05:00 PST).\n'));
    return;
  }
  const result = await runGh(['workflow', 'run', 'Daily Deploy', '--repo', repo]);
  if (result.code === 0) {
    console.log(c.green('✓') + ' Workflow "Daily Deploy" triggered');
    console.log(c.gray('  Watch: ') + c.gray(`https://github.com/${repo}/actions`));
  } else {
    console.error(c.yellow('!') + ' Could not trigger workflow: ' + result.stderr.trim());
    console.error('  You can trigger it manually from the GitHub Actions tab.');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function detectGitHubRepo(cwd) {
  const cfgPath = path.join(cwd, '.git/config');
  if (!fs.existsSync(cfgPath)) return null;
  const cfg = fs.readFileSync(cfgPath, 'utf8');
  // Match SSH (git@github.com:owner/repo.git) and HTTPS (https://github.com/owner/repo.git)
  const m = cfg.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/m);
  return m ? m[1] : null;
}

function commandExists(cmd) {
  return new Promise((resolve) => {
    const proc = spawn('which', [cmd], { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

async function ghIsAuthed() {
  const r = await runGh(['auth', 'status']);
  return r.code === 0;
}

async function listSecrets(repo) {
  const r = await runGh(['secret', 'list', '--repo', repo]);
  if (r.code !== 0) return [];
  return r.stdout
    .split('\n')
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
}

async function setSecret(repo, name, value) {
  const r = await runGh(['secret', 'set', name, '--repo', repo, '--body', value]);
  return r.code === 0;
}

function runGh(args) {
  return new Promise((resolve) => {
    const proc = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
    proc.on('error', (err) => resolve({ code: 1, stdout: '', stderr: err.message }));
  });
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
