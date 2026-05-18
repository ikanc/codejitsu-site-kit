export interface SpecialRule {
  maxWidth?: number | null;
  maxHeight?: number | null;
  quality?: number;
  smartSubsample?: boolean;
  generateAvif?: boolean;
  optimizePng?: boolean;
}

export interface OptimizeImagesConfig {
  sourceDir: string;
  thumbDir?: string;
  defaultQuality?: number;
  defaultMaxSize?: number;
  thumbSize?: number;
  thumbQuality?: number;
  specialRules?: Record<string, SpecialRule>;
}

// @ts-expect-error - .mjs file resolved by Node at runtime
export { optimizeImages } from './optimize.mjs';
