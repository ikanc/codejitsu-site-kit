// fs (gray-matter) blog loader — safe to import from anywhere (including
// astro.config.mjs and non-Astro projects).
//
// For the Astro Content Collections variant, import from
// `@ibalzam/codejitsu-core/blog/collection` (separate subpath because it
// statically imports `astro:content`, which is only available inside Astro).

export * from './types.js';
export { createBlog } from './fs.js';
export type { FsBlogConfig } from './fs.js';
