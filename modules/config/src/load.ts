import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { CodejitsuConfig } from './types.js';

const CANDIDATES = [
  'codejitsu.config.ts',
  'codejitsu.config.mts',
  'codejitsu.config.mjs',
  'codejitsu.config.js',
  'codejitsu.config.json',
];

/**
 * Loads the Codejitsu config from the current working directory (or `cwd`).
 *
 * Search order:
 *   1. `codejitsu.config.{ts,mts,mjs,js,json}` at cwd root.
 *   2. `codejitsu` key in `package.json`.
 *
 * `.ts` and `.mts` files are loaded via `jiti` (peer-installable). If `jiti`
 * isn't available, the loader skips `.ts` candidates and warns once.
 *
 * Throws if no config is found.
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<CodejitsuConfig> {
  for (const name of CANDIDATES) {
    const filePath = path.join(cwd, name);
    if (!fs.existsSync(filePath)) continue;

    if (name.endsWith('.json')) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as CodejitsuConfig;
    }

    if (name.endsWith('.ts') || name.endsWith('.mts')) {
      const config = await loadWithJiti(filePath);
      if (config) return config;
      // jiti unavailable; fall through to other candidates.
      continue;
    }

    // .mjs / .js — Node can load these directly.
    const mod = await import(pathToFileURL(filePath).href);
    return (mod.default ?? mod) as CodejitsuConfig;
  }

  // Fallback: package.json `codejitsu` key.
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.codejitsu) return pkg.codejitsu as CodejitsuConfig;
  }

  throw new Error(
    `No Codejitsu config found in ${cwd}. Create codejitsu.config.ts (or .mjs/.json) ` +
      `at the site root, or add a "codejitsu" key to package.json.`
  );
}

let jitiWarned = false;
async function loadWithJiti(filePath: string): Promise<CodejitsuConfig | null> {
  try {
    const jitiMod = await import('jiti');
    const jitiFactory = (jitiMod as any).default ?? (jitiMod as any).createJiti ?? jitiMod;
    const jiti = typeof jitiFactory === 'function' ? jitiFactory(process.cwd(), { interopDefault: true }) : null;
    if (!jiti) {
      throw new Error('Unexpected jiti API shape.');
    }
    const mod = await jiti.import(filePath, { default: true });
    return (mod as any) as CodejitsuConfig;
  } catch (err) {
    if (!jitiWarned) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(
        `[@ibalzam/codejitsu-core] Could not load TypeScript config (${reason}). ` +
          `Install \`jiti\` as a dev dependency, or rename to codejitsu.config.mjs.`
      );
      jitiWarned = true;
    }
    return null;
  }
}

/**
 * Returns true if the named module is enabled in the config.
 * A module is enabled if its key is present and not `false` and not `enabled: false`.
 */
export function isModuleEnabled(
  config: CodejitsuConfig,
  module: 'blog' | 'seo' | 'images' | 'llms' | 'deploy'
): boolean {
  const value = config[module];
  if (value === undefined || value === false) return false;
  if (typeof value === 'object' && value !== null && (value as { enabled?: boolean }).enabled === false) return false;
  return true;
}
