import type { CodejitsuConfig } from './types.js';

/**
 * Identity helper that types your `codejitsu.config.ts` export.
 *
 * @example
 * // codejitsu.config.ts
 * import { defineConfig } from '@ibalzam/codejitsu-core/config';
 *
 * export default defineConfig({
 *   site: { url: 'https://example.com', name: 'Example' },
 *   blog: { mode: 'collection', dateField: 'pubDate', draftField: 'draft' },
 *   // ...
 * });
 */
export function defineConfig(config: CodejitsuConfig): CodejitsuConfig {
  return config;
}
