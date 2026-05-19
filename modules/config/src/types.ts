/**
 * Unified Codejitsu config — the shape of `codejitsu.config.ts` at site root.
 *
 * One config drives every module. Each top-level module key (`blog`, `seo`,
 * `images`, `llms`, `deploy`) is optional: omit it to disable that module,
 * or include it (even as `{}`) to enable with defaults. Set `enabled: false`
 * to explicitly disable while keeping the section for documentation.
 */
export interface CodejitsuConfig {
  /** Site-wide identity and metadata, used by multiple modules. */
  site: SiteConfig;

  blog?: BlogConfig | false;
  seo?: SeoConfig | false;
  images?: ImagesConfig | false;
  llms?: LlmsConfig | false;
  deploy?: DeployConfig | false;
  contact?: ContactConfig | false;
  audit?: AuditConfig;
  blogWriter?: BlogWriterConfig | false;
}

export interface BlogWriterConfig {
  enabled?: boolean;
  /** Voice + register, free text. e.g. "professional but friendly, confident not boastful". */
  tone: string;
  /** What the company does + who it serves. Helps the writer ground posts in context. */
  about: string;
  /** Primary reader. e.g. "BC Lower Mainland homeowners planning HVAC upgrades". */
  audience: string;
  /** Service names that map to /services/<slug>/. Used for internal-link planning. */
  services: string[];
  /** Location names that map to /service-areas/<slug>/. */
  locations: string[];
  /** Exhaustive tag list. The writer refuses to invent new tags. */
  approvedTags: string[];
  wordCount: { min: number; max: number; default: number };
  faqs?: { min: number; max: number };
  internalLinks?: { min: number; max: number };
  /** Pricing policy. 'brackets-only' = always show as range with context. */
  pricing?: 'brackets-only' | 'allowed' | 'never-mention';
  /** Free-text seasonal rules. e.g. "May-Sep: outdoor + AC; Oct-Nov: pre-winter prep". */
  seasonalRules?: string;
  /** Phrases the writer must NOT produce. e.g. ["In today's fast-paced world", "Look no further"]. */
  bannedPhrases?: string[];
  /** Frontmatter `author` default if a post doesn't specify one. */
  authorDefault?: string;
  imageStyle: BlogImageStyle;
}

export interface BlogImageStyle {
  /** Full prompt-style description of the visual style: palette, framing, materials, mood. */
  description: string;
  /** Branding rule. e.g. "logo small in bottom-right corner, no other brand marks". */
  branding: string;
  /** Where final .webp files live. e.g. "public/assets/images/blog". */
  outputDir: string;
  /** Max words per generated prompt. Typical ≤ 60. */
  maxWords: number;
  realism: 'photorealistic' | 'illustration' | 'cartoon' | 'mixed';
}

export interface ContactConfig {
  enabled?: boolean;
  emailjs: {
    /** EmailJS service ID, e.g. 'service_abc123'. */
    serviceId: string;
    /** EmailJS template ID, e.g. 'template_xyz789'. Template variables must be {{name}}, {{email}}, {{phone}}, {{message}}. */
    templateId: string;
    /** EmailJS public key. Safe to ship to the browser. */
    publicKey: string;
  };
  /** Optional reCAPTCHA v2 sitekey. If set, the modal renders a captcha widget and blocks submit until solved. */
  recaptcha?: {
    siteKey: string;
  };
}

export interface AuditConfig {
  /** Per-provider requirement. 'optional' = pass either way; 'required' = fail if absent; 'banned' = fail if present. */
  analytics?: {
    ga4?: AuditRequirement;
    gtm?: AuditRequirement;
    googleAds?: AuditRequirement;
    ahrefs?: AuditRequirement;
    hotjar?: AuditRequirement;
  };
  /** Site verification meta tags. true = required, false/missing = optional. */
  verification?: {
    googleSearchConsole?: boolean;
    bingWebmaster?: boolean;
  };
  forms?: {
    requireSpamProtection?: boolean;
    requireConsent?: boolean;
  };
}

export type AuditRequirement = 'required' | 'optional' | 'banned';

export interface SiteConfig {
  /** Absolute site URL, no trailing slash. e.g. 'https://example.com'. */
  url: string;
  /** Brand name. e.g. 'Pearl Remodeling'. */
  name: string;
  /** Appended to <title> tags. e.g. ' — Pearl Remodeling'. */
  titleSuffix?: string;
  /** Default author when blog posts don't specify one. */
  defaultAuthor?: string;
  /** Default OG image (relative path or absolute URL). */
  defaultOgImage?: string;
  /** HTML lang attribute. e.g. 'en-US', 'en'. */
  locale?: string;
  /** Optional structured business info for Organization / LocalBusiness schema. */
  business?: BusinessInfo;
}

export interface BusinessInfo {
  legalName?: string;
  telephone?: string;
  email?: string;
  /** Used for LocalBusiness schema and contact pages. */
  address?: PostalAddress;
  geo?: { latitude: number; longitude: number };
  /** Social profile URLs. */
  sameAs?: string[];
  /** e.g. '$$', '$$$'. */
  priceRange?: string;
  /** Service areas. Strings (city names) or objects. */
  areaServed?: string[];
  /** License number for licensed trades. */
  license?: string;
  /** Schema.org type override, e.g. 'HVACBusiness', 'HomeAndConstructionBusiness'. */
  schemaType?: string;
}

export interface PostalAddress {
  streetAddress?: string;
  addressLocality: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: string;
}

export interface BlogConfig {
  enabled?: boolean;
  /**
   * 'collection' — use Astro Content Collections (recommended for Astro sites).
   * 'fs' — read .md files directly via gray-matter (for non-Astro projects).
   * Defaults to 'collection' if the site has astro as a dep; otherwise 'fs'.
   */
  mode?: 'collection' | 'fs';
  /** For 'fs' mode: where the .md files live. Default 'content/blog'. */
  contentDir?: string;
  /** For 'collection' mode: name of the Astro CC. Default 'blog'. */
  collectionName?: string;
  /** Frontmatter field for the post date. Default 'date'. Pearl uses 'pubDate'. */
  dateField?: string;
  /** Frontmatter field for draft state. Default null (no draft support). Pearl uses 'draft'. */
  draftField?: string | null;
  /** Category definitions for /blog/category/[slug] pages. */
  categories?: BlogCategory[];
}

export interface BlogCategory {
  slug: string;
  tag: string;
  title: string;
  subtitle: string;
  metaDescription: string;
}

export interface SeoConfig {
  enabled?: boolean;
  sitemap?: {
    /** Regex patterns to exclude from the sitemap. */
    excludePatterns?: RegExp[];
    /**
     * Site-specific priority rules, evaluated before defaults.
     * First matching pattern wins.
     */
    priorityRules?: Array<{
      pattern: RegExp;
      priority: number;
      changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    }>;
  };
  /**
   * Default schemas to inject site-wide when not overridden per-page.
   * e.g. always-on Organization or LocalBusiness on every page.
   */
  defaultSchemas?: ('organization' | 'localBusiness' | 'website')[];
}

export interface ImagesConfig {
  enabled?: boolean;
  /** Source dir for the recursive optimizer. Default 'public/images'. */
  sourceDir?: string;
  /** Thumbnail output dir. Set to null to disable thumb generation. Default null. */
  thumbDir?: string | null;
  defaultQuality?: number;
  defaultMaxSize?: number;
  thumbSize?: number;
  thumbQuality?: number;
  /**
   * Per-file rule overrides. Key = path relative to sourceDir without extension.
   * e.g. 'logos/logo': { maxWidth: 329, quality: 35, generateAvif: true }
   */
  specialRules?: Record<string, SpecialRule>;
  /**
   * Blog-post image automation. Replaces hand-maintained title→slug maps.
   * If set, the optimizer scans `contentDir` for post filenames and looks for
   * matching source images in `sourceImageDir`, optimizing them into `outputDir`.
   */
  autoBlogImages?: {
    contentDir: string;
    sourceImageDir: string;
    outputDir: string;
    width: number;
    height?: number | null;
    quality?: number;
  };
}

export interface SpecialRule {
  maxWidth?: number | null;
  maxHeight?: number | null;
  quality?: number;
  smartSubsample?: boolean;
  generateAvif?: boolean;
  optimizePng?: boolean;
}

export interface LlmsConfig {
  enabled?: boolean;
  /**
   * 'config' — sections are listed explicitly in this config (simplest sites).
   * 'content-scan' — modules scan content dirs to enumerate URLs (pearl pattern).
   * Default 'config'.
   */
  mode?: 'config' | 'content-scan';

  /** One-line tagline appended to the title in the output. */
  tagline?: string;
  /** Short "About" paragraph (used in llms.txt). */
  about?: string;
  /** Longer "About" content (used in llms-full.txt; falls back to `about`). */
  aboutFull?: string;
  /** Sections for 'config' mode. Ignored in 'content-scan' mode. */
  sections?: LlmsSection[];
  /** "For AI Assistants" block content (both modes). */
  aiGuidance?: string;

  /** Blog directory (auto-included in both modes). */
  blogDir?: string;
  blogLimit?: number;
  blogFullLimit?: number;

  /** Settings for 'content-scan' mode. */
  contentScan?: {
    servicesDir?: string;
    locationsDir?: string;
    pagesDir?: string;
  };
}

export interface LlmsSection {
  title: string;
  description?: string;
  items: LlmsSectionItem[];
}

export interface LlmsSectionItem {
  title: string;
  description: string;
  url: string;
  fullDescription?: string;
}

export interface DeployConfig {
  enabled?: boolean;
  /** Cloudflare Pages project name. Used for documentation only. */
  cloudflarePagesName?: string;
}
