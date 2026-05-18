import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Top-level entry — picks 'config' or 'content-scan' mode based on `llms.mode`.
 */
export async function generateLlms({ config, cwd, outDir }) {
  const llms = config.llms ?? {};
  const mode = llms.mode ?? 'config';

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  if (mode === 'content-scan') {
    const out = await generateContentScan({ config, cwd });
    fs.writeFileSync(path.join(outDir, 'llms.txt'), out.concise);
    fs.writeFileSync(path.join(outDir, 'llms-full.txt'), out.full);
  } else {
    const out = generateFromConfig({ config });
    fs.writeFileSync(path.join(outDir, 'llms.txt'), out.concise);
    fs.writeFileSync(path.join(outDir, 'llms-full.txt'), out.full);
  }
  console.log(`✓ ${path.relative(cwd, path.join(outDir, 'llms.txt'))}`);
  console.log(`✓ ${path.relative(cwd, path.join(outDir, 'llms-full.txt'))}`);
}

// ─── Common helpers ─────────────────────────────────────────────────────────

function getTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isoDate() {
  return new Date().toISOString().split('T')[0];
}

function absoluteUrl(siteUrl, url) {
  if (/^https?:\/\//.test(url)) return url;
  const base = siteUrl.replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function readBlogPosts(blogDir, dateField = 'date', draftField = null) {
  if (!blogDir || !fs.existsSync(blogDir)) return [];
  const today = getTodayUTC();
  return fs
    .readdirSync(blogDir)
    .filter((n) => n.endsWith('.md'))
    .map((fileName) => {
      const raw = fs.readFileSync(path.join(blogDir, fileName), 'utf8');
      const { data } = matter(raw);
      const slug = data.slug || fileName.replace(/\.md$/, '');
      const dateVal = data[dateField];
      const date = dateVal instanceof Date
        ? dateVal.toISOString().split('T')[0]
        : (typeof dateVal === 'string' ? dateVal : '');
      return { ...data, slug, date };
    })
    .filter((p) => {
      if (draftField && p[draftField]) return false;
      if (!p.date) return true;
      return new Date(p.date) <= today;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── 'config' mode ──────────────────────────────────────────────────────────

function generateFromConfig({ config }) {
  const site = config.site;
  const llms = config.llms ?? {};
  const blogPosts = llms.blogDir
    ? readBlogPosts(path.resolve(process.cwd(), llms.blogDir))
    : [];

  const concise = renderConcise({
    siteUrl: site.url,
    siteName: site.name,
    tagline: llms.tagline,
    about: llms.about,
    business: site.business,
    sections: llms.sections ?? [],
    aiGuidance: llms.aiGuidance,
    blogPosts: blogPosts.slice(0, llms.blogLimit ?? 10),
    today: isoDate(),
  });

  const full = renderFull({
    siteUrl: site.url,
    siteName: site.name,
    tagline: llms.tagline,
    about: llms.aboutFull ?? llms.about,
    business: site.business,
    sections: llms.sections ?? [],
    aiGuidance: llms.aiGuidance,
    blogPosts: blogPosts.slice(0, llms.blogFullLimit ?? 20),
    today: isoDate(),
  });

  return { concise, full };
}

function renderConcise({ siteUrl, siteName, tagline, about, business, sections, aiGuidance, blogPosts, today }) {
  let out = `# ${siteName}${tagline ? ` — ${tagline}` : ''}\n`;
  out += `Last Updated: ${today}\n\n`;
  if (about) out += `> ${about}\n\n`;

  if (business) {
    out += `## Contact\n\n`;
    if (business.telephone) out += `- Phone: ${business.telephone}\n`;
    if (business.email) out += `- Email: ${business.email}\n`;
    if (business.address) out += `- Address: ${formatAddress(business.address)}\n`;
    out += `- Website: ${siteUrl}\n`;
    if (business.license) out += `- License: ${business.license}\n`;
    out += '\n';
  }

  for (const section of sections) {
    if (!section.items?.length) continue;
    out += `## ${section.title}\n\n`;
    for (const item of section.items) {
      out += `- [${item.title}](${absoluteUrl(siteUrl, item.url)}): ${item.description}\n`;
    }
    out += '\n';
  }

  if (blogPosts.length) {
    out += `## Recent Blog Posts\n\n`;
    for (const post of blogPosts) {
      out += `- [${post.title}](${siteUrl}/blog/${post.slug}/): ${post.description}\n`;
    }
    out += '\n';
  }

  if (aiGuidance) out += `## For AI Assistants\n\n${aiGuidance}\n\n`;
  out += `---\nGenerated automatically during build\n`;
  return out;
}

function renderFull({ siteUrl, siteName, tagline, about, business, sections, aiGuidance, blogPosts, today }) {
  let out = `# ${siteName} — Complete Documentation\n`;
  out += `Last Updated: ${today}\n\n`;
  out += `> For a concise navigation overview, see /llms.txt\n\n---\n\n`;
  if (about) out += `# About\n\n${about}\n\n---\n\n`;

  if (business) {
    out += `# Contact Information\n\n`;
    if (business.telephone) out += `- **Phone:** ${business.telephone}\n`;
    if (business.email) out += `- **Email:** ${business.email}\n`;
    if (business.address) out += `- **Address:** ${formatAddress(business.address)}\n`;
    out += `- **Website:** ${siteUrl}\n`;
    if (business.license) out += `- **License:** ${business.license}\n`;
    out += '\n---\n\n';
  }

  for (const section of sections) {
    if (!section.items?.length) continue;
    out += `# ${section.title}\n\n`;
    if (section.description) out += `${section.description}\n\n`;
    for (const item of section.items) {
      out += `## ${item.title}\n\n`;
      out += `**URL**: ${absoluteUrl(siteUrl, item.url)}\n\n`;
      out += `${item.fullDescription ?? item.description}\n\n---\n\n`;
    }
  }

  if (blogPosts.length) {
    out += `# Blog Posts\n\n`;
    for (const post of blogPosts) {
      out += `## ${post.title}\n\n`;
      if (post.date) out += `**Published**: ${post.date}\n`;
      if (post.author) out += `**Author**: ${post.author}\n`;
      if (post.tags?.length) out += `**Tags**: ${post.tags.join(', ')}\n`;
      out += `**URL**: ${siteUrl}/blog/${post.slug}/\n\n${post.description}\n\n---\n\n`;
    }
  }

  if (aiGuidance) out += `# For AI Assistants\n\n${aiGuidance}\n\n`;
  out += `---\nGenerated automatically during build\n`;
  return out;
}

function formatAddress(addr) {
  const parts = [
    addr.streetAddress,
    [addr.addressLocality, addr.addressRegion].filter(Boolean).join(', '),
    addr.postalCode,
    addr.addressCountry,
  ].filter(Boolean);
  return parts.join(', ');
}

// ─── 'content-scan' mode ────────────────────────────────────────────────────

async function generateContentScan({ config, cwd }) {
  const site = config.site;
  const llms = config.llms;
  const scan = llms.contentScan ?? {};

  const servicesDir = scan.servicesDir ? path.resolve(cwd, scan.servicesDir) : null;
  const locationsDir = scan.locationsDir ? path.resolve(cwd, scan.locationsDir) : null;
  const pagesDir = scan.pagesDir ? path.resolve(cwd, scan.pagesDir) : null;
  const blogDir = llms.blogDir ? path.resolve(cwd, llms.blogDir) : null;

  const services = readContentDir(servicesDir);
  const locations = readContentDir(locationsDir);
  const blogPosts = readBlogPosts(blogDir, 'pubDate', 'draft').concat(
    // Also try 'date' field for fallback
    blogDir && readBlogPosts(blogDir, 'date', 'draft').filter((p) => !p.pubDate) || []
  );
  const pages = pagesDir ? collectStaticPages(pagesDir) : [];

  const dynamicRoutes = scan.dynamicRoutes ?? [];
  const expandedUrls = expandRoutes(dynamicRoutes, {
    services: services.map((s) => s.slug),
    locations: locations.map((l) => l.slug),
  });

  const concise = renderContentScanConcise({
    siteUrl: site.url,
    siteName: site.name,
    tagline: llms.tagline,
    about: llms.about,
    business: site.business,
    services,
    locations,
    pages: pages.concat(expandedUrls),
    blogPosts: blogPosts.slice(0, llms.blogLimit ?? 10),
    aiGuidance: llms.aiGuidance,
    today: isoDate(),
  });

  const full = renderContentScanFull({
    siteUrl: site.url,
    siteName: site.name,
    tagline: llms.tagline,
    about: llms.aboutFull ?? llms.about,
    business: site.business,
    services,
    locations,
    aiGuidance: llms.aiGuidance,
    today: isoDate(),
  });

  return { concise, full };
}

function readContentDir(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const entries = walkMd(dir);
  return entries.map((file) => {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    const slug = path.basename(file, '.md');
    return { file, slug, data, body: content };
  });
}

function walkMd(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMd(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function collectStaticPages(dir) {
  const out = [];
  function walk(d, prefix = '') {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${prefix}/${entry.name}`);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.astro')) continue;
      if (entry.name.includes('[')) continue;
      const stem = entry.name.replace(/\.astro$/, '');
      if (stem === '404') continue;
      const route = stem === 'index' ? prefix || '/' : `${prefix}/${stem}`;
      out.push(route.endsWith('/') ? route : `${route}/`);
    }
  }
  walk(dir);
  return out;
}

function expandRoutes(routes, slugSets) {
  const out = [];
  for (const route of routes) {
    const template = typeof route === 'string' ? route : route.template;
    const placeholders = (template.match(/\{(\w+)\}/g) ?? []).map((p) => p.slice(1, -1));
    if (placeholders.length === 0) {
      out.push(template);
      continue;
    }
    const arrays = placeholders.map((name) => slugSets[name] ?? []);
    if (arrays.some((a) => a.length === 0)) continue;
    for (const combo of cartesian(arrays)) {
      let url = template;
      placeholders.forEach((name, i) => {
        url = url.replace(`{${name}}`, combo[i]);
      });
      out.push(url);
    }
  }
  return out;
}

function cartesian(arrays) {
  return arrays.reduce(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]]
  );
}

function renderContentScanConcise({ siteUrl, siteName, tagline, about, business, services, locations, pages, blogPosts, aiGuidance, today }) {
  const lines = [];
  lines.push(`# ${siteName}${tagline ? ` — ${tagline}` : ''}`);
  lines.push(`Last Updated: ${today}`, '');
  if (about) lines.push(`> ${about}`, '');

  if (business) {
    lines.push('## Contact', '');
    if (business.telephone) lines.push(`- Phone: ${business.telephone}`);
    if (business.email) lines.push(`- Email: ${business.email}`);
    if (business.address) lines.push(`- Address: ${formatAddress(business.address)}`);
    lines.push(`- Website: ${siteUrl}`);
    if (business.license) lines.push(`- License: ${business.license}`);
    lines.push('');
  }

  if (services.length) {
    lines.push('## Services', '');
    for (const s of services) {
      lines.push(`- ${s.data.title ?? s.slug}`);
    }
    lines.push('');
  }

  if (locations.length) {
    lines.push('## Service Areas', '');
    for (const l of locations) {
      lines.push(`- ${l.data.name ?? l.data.title ?? l.slug}`);
    }
    lines.push('');
  } else if (business?.areaServed?.length) {
    lines.push('## Service Areas', '');
    for (const area of business.areaServed) lines.push(`- ${area}`);
    lines.push('');
  }

  if (blogPosts.length) {
    lines.push('## Recent Blog Posts', '');
    for (const post of blogPosts) {
      lines.push(`- [${post.title}](${siteUrl}/blog/${post.slug}/): ${post.description ?? ''}`);
    }
    lines.push('');
  }

  if (pages.length) {
    lines.push('## Site Pages', '');
    for (const p of pages.sort()) lines.push(`- ${siteUrl}${p}`);
    lines.push('');
  }

  if (aiGuidance) lines.push('## For AI Assistants', '', aiGuidance, '');
  lines.push('---', 'Generated automatically during build');
  return lines.join('\n') + '\n';
}

function renderContentScanFull({ siteUrl, siteName, tagline, about, business, services, locations, aiGuidance, today }) {
  const lines = [];
  lines.push(`# ${siteName} — Full Reference`);
  lines.push(`Last Updated: ${today}`, '');
  if (tagline) lines.push(`> ${tagline}`, '');
  if (about) lines.push(about, '');
  lines.push('---', '');

  if (business) {
    lines.push('## Contact Information', '');
    if (business.telephone) lines.push(`- **Phone:** ${business.telephone}`);
    if (business.email) lines.push(`- **Email:** ${business.email}`);
    if (business.address) lines.push(`- **Address:** ${formatAddress(business.address)}`);
    lines.push(`- **Website:** ${siteUrl}`);
    if (business.license) lines.push(`- **License:** ${business.license}`);
    lines.push('', '---', '');
  }

  if (services.length) {
    lines.push('## Services', '');
    for (const svc of services) {
      const fm = svc.data;
      lines.push(`### ${fm.title ?? svc.slug}`, '');
      if (fm.shortDescription) lines.push(fm.shortDescription, '');
      else if (fm.description) lines.push(fm.description, '');
      if (Array.isArray(fm.benefits) && fm.benefits.length) {
        lines.push('**Key Benefits:**', '');
        for (const b of fm.benefits) lines.push(`- ${b}`);
        lines.push('');
      }
      const faqs = extractFaqsFromBody(svc.body);
      if (faqs.length) {
        lines.push('**Frequently Asked Questions:**', '');
        for (const faq of faqs) {
          lines.push(`**Q: ${faq.q}**`, `A: ${faq.a}`, '');
        }
      }
      lines.push('---', '');
    }
  }

  if (locations.length) {
    lines.push('## Service Areas', '');
    for (const loc of locations) {
      const fm = loc.data;
      const name = fm.name ?? fm.title ?? loc.slug;
      lines.push(`### ${name}`, '');
      if (fm.description) {
        const desc = typeof fm.description === 'string' ? fm.description : fm.description.join(' ');
        lines.push(desc, '');
      }
    }
    lines.push('---', '');
  } else if (business?.areaServed?.length) {
    lines.push('## Service Areas', '');
    for (const area of business.areaServed) lines.push(`- ${area}`);
    lines.push('', '---', '');
  }

  lines.push(`## Optional`, '', `- Sitemap: ${siteUrl}/sitemap-index.xml`, '');
  if (aiGuidance) lines.push('## For AI Assistants', '', aiGuidance, '');
  return lines.join('\n') + '\n';
}

function extractFaqsFromBody(body) {
  const faqs = [];
  const re = /- question: ["'](.+?)["']\s*\n\s*answer: ["'](.+?)["']/gs;
  let m;
  while ((m = re.exec(body)) !== null) faqs.push({ q: m[1], a: m[2] });
  return faqs;
}
