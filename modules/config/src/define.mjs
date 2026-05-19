/**
 * Identity helper that types your `codejitsu.config.ts` export.
 *
 * @example
 * // codejitsu.config.ts
 * import { defineConfig } from '@ibalzam/codejitsu-core/config';
 * export default defineConfig({ site: { url: '...', name: '...' } });
 *
 * @param {import('./types.js').CodejitsuConfig} config
 * @returns {import('./types.js').CodejitsuConfig}
 */
export function defineConfig(config) {
  return config;
}
