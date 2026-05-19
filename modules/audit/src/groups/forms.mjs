import { pass, fail, warn, info, summarize } from '../util.mjs';

export async function runForms(ctx) {
  const { htmlFiles, config } = ctx;
  const auditCfg = config.audit ?? {};
  const formCfg = auditCfg.forms ?? {};
  const results = [];

  // Dedupe forms by a stable signature so a shared modal counted on 127 pages
  // doesn't masquerade as "127 forms".
  const seen = new Map(); // signature → { firstPage, action, method, occurrences, hasCaptcha, hasConsent, hasHoneypot, hasJsHook }
  for (const f of htmlFiles) {
    for (const m of f.content.matchAll(/<form([^>]*)>([\s\S]*?)<\/form>/gi)) {
      const attrs = m[1];
      const body = m[2];
      const id = attrs.match(/\bid=["']([^"']+)["']/)?.[1];
      const action = attrs.match(/\baction=["']([^"']*)["']/)?.[1] ?? null;
      const method = attrs.match(/\bmethod=["']([^"']*)["']/)?.[1] ?? 'get';
      // Signature ≈ id + action + first 200 chars of body. Stable across pages.
      const signature = `${id ?? ''}|${action ?? ''}|${body.slice(0, 200)}`;

      const hasCaptcha = /(?:recaptcha|hcaptcha|h-captcha|turnstile)/i.test(body) ||
                         /(?:recaptcha|hcaptcha|h-captcha|turnstile)/i.test(f.content);
      const hasConsent =
        /<input[^>]+type=["']checkbox["'][^>]*(?:consent|terms|privacy|gdpr|casl|agree)/i.test(body);
      const hasHoneypot =
        /<input[^>]+name=["'](?:bot[-_]?field|honey|trap|website|url)["'][^>]+(?:hidden|display\s*:\s*none|visibility\s*:\s*hidden|aria-hidden=["']true)/i.test(body);
      // Heuristic: page has form-submission JS hooks (addEventListener('submit'),
      // emailjs/fetch/axios, or references to the form's id). False negatives
      // (missing here) get caught by the manual review the audit prompts.
      const jsHints = [
        /addEventListener\(['"]submit['"]/,
        /\.onsubmit\s*=/,
        /emailjs\.(?:send|sendForm)/,
        /netlify-forms|formspree|getform|web3forms/i,
      ];
      const hasJsHook =
        jsHints.some((re) => re.test(f.content)) ||
        (!!id && new RegExp(`['"\`]${id}['"\`]`).test(f.content));

      if (seen.has(signature)) {
        seen.get(signature).occurrences++;
      } else {
        seen.set(signature, {
          firstPage: f.relPath,
          id,
          action,
          method,
          occurrences: 1,
          hasCaptcha,
          hasConsent,
          hasHoneypot,
          hasJsHook,
        });
      }
    }
  }

  const forms = [...seen.values()];

  if (forms.length === 0) {
    results.push(info('No <form> elements found in built HTML'));
    return results;
  }

  results.push(info(
    `${forms.length} unique form${forms.length === 1 ? '' : 's'}`,
    forms.map((x) => `${x.id ?? '(no id)'} on ${x.firstPage}${x.occurrences > 1 ? ` (×${x.occurrences})` : ''} → action: ${x.action ?? '(none)'}`)
  ));

  // Forms without action AND without a JS hook → likely broken.
  const orphanForms = forms.filter((x) => !x.action && !x.hasJsHook);
  results.push(
    orphanForms.length === 0
      ? pass('All forms have an action OR a JS submit handler')
      : warn(
          `${orphanForms.length} forms with no action and no JS hook`,
          orphanForms.map((x) => `${x.firstPage}: id=${x.id ?? '(none)'}`)
        )
  );

  // Spam protection (if required).
  if (formCfg.requireSpamProtection !== false) {
    const noProtection = forms.filter((x) => !x.hasCaptcha && !x.hasHoneypot);
    results.push(
      noProtection.length === 0
        ? pass('All forms have spam protection (captcha or honeypot)')
        : warn(
            `${noProtection.length} forms without spam protection`,
            noProtection.map((x) => `${x.firstPage}: id=${x.id ?? '(none)'}`)
          )
    );
  }

  // Consent (if required).
  if (formCfg.requireConsent === true) {
    const noConsent = forms.filter((x) => !x.hasConsent);
    results.push(
      noConsent.length === 0
        ? pass('All forms have GDPR/CASL consent')
        : fail(
            `${noConsent.length} forms missing consent`,
            noConsent.map((x) => `${x.firstPage}: id=${x.id ?? '(none)'}`)
          )
    );
  } else {
    const withConsent = forms.filter((x) => x.hasConsent).length;
    results.push(info(`${withConsent}/${forms.length} forms have visible consent indicators`));
  }

  return results;
}
