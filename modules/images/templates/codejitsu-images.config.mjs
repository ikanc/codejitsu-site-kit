/** @type {import('@ibalzam/codejitsu-core/images').OptimizeImagesConfig} */
export default {
  sourceDir: 'public/images',
  thumbDir: 'public/images/thumbs',
  defaultQuality: 75,
  defaultMaxSize: 1200,
  thumbSize: 400,
  thumbQuality: 70,

  // Per-file overrides. Key = path relative to sourceDir, without extension.
  specialRules: {
    // Example: aggressively compress the logo, also generate AVIF.
    // 'logos/logo': { maxWidth: 329, maxHeight: 70, quality: 35, generateAvif: true },
    //
    // Example: OG share image — keep quality high, optimize the PNG in place too.
    // 'sharing/og-default': { maxWidth: 1200, maxHeight: 630, quality: 85, optimizePng: true },
  },
};
