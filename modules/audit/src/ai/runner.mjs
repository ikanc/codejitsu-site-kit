import { spawn } from 'child_process';
import { pass, fail, warn, info } from '../util.mjs';

/**
 * AI-tier audit via `claude -p` headless. Samples a few pages, asks Claude to
 * proofread + score AI-friendliness, displays findings in the audit summary.
 *
 * Uses --bare mode and --model sonnet to minimize context cost. A typical
 * audit (3 sample pages) costs ~$0.02–0.05.
 */
export async function runAi(ctx) {
  const { htmlFiles, ai } = ctx;
  if (!ai) return [];

  // Verify claude is in PATH.
  const claudeAvailable = await commandExists('claude');
  if (!claudeAvailable) {
    return [warn(
      'AI tier skipped — `claude` CLI not in PATH',
      'Install Claude Code: https://claude.com/claude-code'
    )];
  }

  const results = [];
  const sample = pickSample(htmlFiles, 3);

  results.push(info(`AI sampling ${sample.length} pages via claude -p (--model sonnet)`));

  let totalIssues = 0;
  let totalCost = 0;

  for (const f of sample) {
    const text = extractMainText(f.content);
    if (text.length < 200) {
      results.push(info(`Skipped ${f.relPath} (too short: ${text.length} chars)`));
      continue;
    }

    const proofread = await callClaude(buildProofreadPrompt(text), f.relPath);
    if (proofread.error) {
      results.push(warn(`Proofread failed: ${f.relPath}`, proofread.error));
      continue;
    }
    totalCost += proofread.costUsd ?? 0;

    if (proofread.issues.length === 0) {
      results.push(pass(`Proofread clean: ${f.relPath}`));
    } else {
      totalIssues += proofread.issues.length;
      const details = proofread.issues.slice(0, 5).map((i) => `${i.severity}: ${i.message}`);
      const sev = proofread.issues.some((i) => i.severity === 'fail') ? 'fail' : 'warn';
      const result = sev === 'fail' ? fail : warn;
      results.push(result(
        `Proofread: ${proofread.issues.length} issues in ${f.relPath}`,
        details
      ));
    }
  }

  if (totalCost > 0) {
    results.push(info(`AI tier total cost: ~$${totalCost.toFixed(3)}`));
  }

  return results;
}

function buildProofreadPrompt(text) {
  return `Read the webpage content between <PAGE> tags. Identify ONLY:
- Typos / misspellings
- Grammar errors
- Sentences that are objectively broken or incoherent

DO NOT flag style preferences, alternative phrasings, or things you'd just personally prefer.

Output STRICT JSON, no markdown, no preamble. Schema:
{"issues": [{"severity": "fail" | "warn", "message": "specific issue with quoted text"}]}

If no issues: {"issues": []}

<PAGE>
${text}
</PAGE>`;
}

async function callClaude(prompt, label) {
  try {
    // Note: --bare requires ANTHROPIC_API_KEY env var. We don't use it so users
    // on OAuth (Claude Code subscribers) still work. Cost is higher per call
    // (~$0.07 with sonnet) but the audit only samples a few pages.
    const out = await runCmd(
      'claude',
      [
        '--model', 'sonnet',
        '--system-prompt', 'You are a senior copy editor. Output strict JSON only, no preamble.',
        '--disallowedTools', 'Bash,Edit,Write,Read,Glob,Grep,Agent',
        '-p',
        '--output-format', 'json',
        prompt,
      ],
      120_000
    );

    if (out.code !== 0) {
      return { error: `claude exit ${out.code}: ${out.stderr.slice(0, 200)}` };
    }

    // claude -p --output-format json returns an envelope { result, total_cost_usd, ... }
    let envelope;
    try { envelope = JSON.parse(out.stdout); }
    catch { return { error: 'Could not parse claude envelope JSON' }; }

    const inner = (envelope.result ?? '').trim();
    const costUsd = envelope.total_cost_usd;

    // Strip code fences if Claude added them despite the instruction.
    const cleaned = inner.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch { return { error: `Claude returned non-JSON: ${cleaned.slice(0, 100)}` }; }

    return { issues: parsed.issues ?? [], costUsd };
  } catch (err) {
    return { error: err.message ?? String(err) };
  }
}

function pickSample(files, n) {
  const sample = [];
  const home = files.find((f) => f.relPath === 'index.html');
  if (home) sample.push(home);
  for (const f of files) {
    if (sample.length >= n) break;
    if (sample.includes(f)) continue;
    if (f.relPath === '404.html') continue;
    sample.push(f);
  }
  return sample;
}

function extractMainText(html) {
  let cleaned = html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');
  const main = cleaned.match(/<main[\s\S]*?<\/main>/i);
  if (main) cleaned = main[0];
  const text = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).slice(0, 2500).join(' ');
}

async function commandExists(cmd) {
  return new Promise((resolve) => {
    const proc = spawn('which', [cmd], { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

function runCmd(cmd, args, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    const t = setTimeout(() => {
      proc.kill();
      reject(new Error(`${cmd} timed out`));
    }, timeoutMs);
    proc.on('error', (err) => { clearTimeout(t); reject(err); });
    proc.on('close', (code) => { clearTimeout(t); resolve({ code, stdout, stderr }); });
  });
}
