/**
 * JSON-LD schema.org builders. Each function returns a plain object ready
 * to `JSON.stringify` and inject into a `<script type="application/ld+json">`.
 *
 * Helper at the bottom: `jsonLd(obj)` returns the stringified script body.
 */

export interface OrganizationInput {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  email?: string;
  telephone?: string;
}

export function organization(input: OrganizationInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
    ...(input.logo && { logo: input.logo }),
    ...(input.sameAs && { sameAs: input.sameAs }),
    ...(input.email && { email: input.email }),
    ...(input.telephone && { telephone: input.telephone }),
  };
}

export interface PostalAddress {
  streetAddress?: string;
  addressLocality: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: string;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocalBusinessInput {
  name: string;
  url: string;
  telephone: string;
  image?: string;
  priceRange?: string;
  address: PostalAddress;
  geo?: GeoCoordinates;
  openingHours?: string[];
  areaServed?: string[];
  sameAs?: string[];
  /** Override @type to a more specific LocalBusiness subtype, e.g. 'HVACBusiness', 'HomeAndConstructionBusiness'. */
  type?: string;
}

export function localBusiness(input: LocalBusinessInput) {
  return {
    '@context': 'https://schema.org',
    '@type': input.type ?? 'LocalBusiness',
    name: input.name,
    url: input.url,
    telephone: input.telephone,
    ...(input.image && { image: input.image }),
    ...(input.priceRange && { priceRange: input.priceRange }),
    address: { '@type': 'PostalAddress', ...input.address },
    ...(input.geo && { geo: { '@type': 'GeoCoordinates', ...input.geo } }),
    ...(input.openingHours && { openingHoursSpecification: input.openingHours }),
    ...(input.areaServed && { areaServed: input.areaServed }),
    ...(input.sameAs && { sameAs: input.sameAs }),
  };
}

export interface WebSiteInput {
  name: string;
  url: string;
  /** If set, adds SearchAction pointing to this URL template (with `{search_term_string}`). */
  searchUrlTemplate?: string;
}

export function website(input: WebSiteInput) {
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
  };
  if (input.searchUrlTemplate) {
    base.potentialAction = {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: input.searchUrlTemplate },
      'query-input': 'required name=search_term_string',
    };
  }
  return base;
}

export interface BlogPostingInput {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  authorName?: string;
  publisherName: string;
  publisherLogo?: string;
}

export function blogPosting(input: BlogPostingInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    url: input.url,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    ...(input.image && { image: input.image }),
    ...(input.authorName && {
      author: { '@type': 'Person', name: input.authorName },
    }),
    publisher: {
      '@type': 'Organization',
      name: input.publisherName,
      ...(input.publisherLogo && {
        logo: { '@type': 'ImageObject', url: input.publisherLogo },
      }),
    },
  };
}

export interface FAQ {
  question: string;
  answer: string;
}

export function faqPage(faqs: FAQ[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ServiceInput {
  name: string;
  description: string;
  url: string;
  provider: { name: string; url: string };
  areaServed?: string[];
  serviceType?: string;
}

export function service(input: ServiceInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: input.url,
    provider: {
      '@type': 'Organization',
      name: input.provider.name,
      url: input.provider.url,
    },
    ...(input.areaServed && { areaServed: input.areaServed }),
    ...(input.serviceType && { serviceType: input.serviceType }),
  };
}

/** Stringify a schema object for safe injection into <script type="application/ld+json">. */
export function jsonLd(schema: unknown): string {
  // Escape `</` to prevent breakout from the script tag.
  return JSON.stringify(schema).replace(/<\//g, '<\\/');
}
