export type { ImagesConfig, SpecialRule } from '../../config/src/types.js';

// @ts-expect-error - .mjs file resolved by Node at runtime
export { optimizeImages } from './optimize.mjs';
// @ts-expect-error - .mjs file resolved by Node at runtime
export { autoBlogImages } from './auto-blog.mjs';
