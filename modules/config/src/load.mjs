import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const CANDIDATES = [
  'codejitsu.config.ts',
  'codejitsu.config.mts',
  'codejitsu.config.mjs',
  'codejitsu.config.js',
  'codejitsu.config.json',
];

/**
 * Loads the Codejitsu config from the current working directory.
 *
 * Search order:
 *   1. `codejitsu.config.{ts,mts,mjs,js,json}` at cwd root.
 *   2. `codejitsu` key in `package.json`.
 *
 * `.ts` and `.mts` files load via `jiti`. If `jiti` isn't installed, the
 * loader warns once and falls through to other candidates.
 *
 * @param {string} [cwd=process.cwd()]
 * @returns {Promise<import('./types.js').CodejitsuConfig>}
 */
export async function loadConfig(cwd = process.cwd()) {
  for (const name of CANDIDATES) {
    const filePath = path.join(cwd, name);
    if (!fs.existsSync(filePath)) continue;

    if (name.endsWith('.json')) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    if (name.endsWith('.ts') || name.endsWith('.mts')) {
      const config = await loadWithJiti(filePath);
      if (config) return config;
      continue;
    }

    const mod = await import(pathToFileURL(filePath).href);
    return mod.default ?? mod;
  }

  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.codejitsu) return pkg.codejitsu;
  }

  throw new Error(
    `No Codejitsu config found in ${cwd}. Create codejitsu.config.ts (or .mjs/.json) ` +
      `at the site root, or add a "codejitsu" key to package.json.`
  );
}

let jitiWarned = false;
async function loadWithJiti(filePath) {
  try {
    const jitiMod = await import('jiti');
    const factory = jitiMod.createJiti ?? jitiMod.default ?? jitiMod;
    if (typeof factory !== 'function') {
      throw new Error('Unexpected jiti API shape.');
    }
    const jiti = factory(process.cwd(), { interopDefault: true });
    const mod = await jiti.import(filePath, { default: true });
    return mod;
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
 * @param {import('./types.js').CodejitsuConfig} config
 * @param {'blog'|'seo'|'images'|'llms'|'deploy'} module
 * @returns {boolean}
 */
export function isModuleEnabled(config, module) {
  const value = config[module];
  if (value === undefined || value === false) return false;
  if (typeof value === 'object' && value !== null && value.enabled === false) return false;
  return true;
}
