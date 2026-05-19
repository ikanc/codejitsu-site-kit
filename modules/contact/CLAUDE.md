# Contact module — instructions for Claude

When the user asks to **add a contact form** (or quote modal, lead capture, "implement codejitsu/core/contact"), do the following.

## What this module provides

A single, accessible contact modal component that:

- Renders a centered modal with optional left-side image
- Configurable fields (name, email, phone, message) — each enabled/required
- Configurable title, submit button text, thank-you toast
- HTML5 validation + custom hidden honeypot
- Optional Google reCAPTCHA v2
- Submits via [EmailJS](https://www.emailjs.com/) (`emailjs.sendForm`)
- Dispatches `codejitsu-contact-submitted` event on success (sites wire analytics)
- Full focus trap, Esc to close, backdrop click, focus restoration

One modal per page (per id). Triggered from any `<button data-codejitsu-contact-trigger>` element.

## Wiring it into an Astro site

### 1. Set up EmailJS

(Site owner does this once, not Claude.) Sign up at https://www.emailjs.com/, create:
- a service (e.g. Gmail, SMTP)
- a template that uses these template variables: `{{name}}`, `{{email}}`, `{{phone}}`, `{{message}}`
- copy the service ID, template ID, and public key

### 1a. CRITICAL — reCAPTCHA on a static site only works if EmailJS verifies it

The modal shows the reCAPTCHA widget client-side, but **without server-side
verification of the token, the widget is theater**. A static site has no server
to run the verification. EmailJS provides this verification as a service — you
must enable it explicitly:

1. EmailJS dashboard → **Email Templates** → your template → **Settings** tab
2. Toggle **"Verify reCAPTCHA"** on
3. Paste your reCAPTCHA **secret key** (NOT the sitekey — the secret key, found
   alongside the sitekey in Google's reCAPTCHA admin)
4. Save

Now EmailJS rejects submissions with invalid tokens before sending the email.

If you SKIP this step, leave reCAPTCHA out of the modal entirely. Use the
honeypot (always on) + EmailJS rate limits as your spam defense. A
non-verified reCAPTCHA widget is friction with no real benefit and breaks on
localhost during dev.

### 2. Drop the modal into a layout

In a layout that wraps every page (e.g. `src/layouts/BaseLayout.astro`), import and place the component **once**, anywhere inside `<body>` (typically just before `</body>`):

```astro
---
import ContactModal from '@ibalzam/codejitsu-core/contact/ContactModal.astro';
import config from '../../codejitsu.config';
---

<!-- ... existing layout content ... -->

<ContactModal
  title="Get a Free Quote"
  image={{ src: '/assets/images/contact.webp', alt: 'Our team' }}
  fields={{
    name:    { required: true },
    email:   { required: true },
    phone:   { required: true },
    message: { required: false },
  }}
  submitText="Submit Quote Request"
  thankYouMessage="Thanks! We'll be in touch within 24 hours."
  emailjs={{
    serviceId: config.contact.emailjs.serviceId,
    templateId: config.contact.emailjs.templateId,
    publicKey: config.contact.emailjs.publicKey,
  }}
  recaptcha={config.contact.recaptcha}
/>
```

Pass the EmailJS keys via `codejitsu.config.ts` so they're declared once, not hardcoded in every layout.

### 3. Add EmailJS keys to `codejitsu.config.ts`

```ts
import { defineConfig } from '@ibalzam/codejitsu-core/config';

export default defineConfig({
  // ...
  contact: {
    emailjs: {
      serviceId: 'service_xxx',
      templateId: 'template_xxx',
      publicKey: 'xxx',          // safe to ship to browser (public)
    },
    recaptcha: {
      siteKey: '6Lxxxxxxxxxxxxxxx',  // optional
    },
  },
});
```

### 4. Add triggers anywhere

Any clickable element with `data-codejitsu-contact-trigger`:

```html
<button data-codejitsu-contact-trigger>Get a quote</button>
<a href="#contact" data-codejitsu-contact-trigger>Talk to us</a>
```

### 5. Optional: wire analytics

The component dispatches a `codejitsu-contact-submitted` event on success. Add a listener for GA4 / Google Ads / etc.:

```html
<script is:inline>
  window.addEventListener('codejitsu-contact-submitted', (e) => {
    // e.detail = { modalId, formData: { name, email, phone, message } }
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', { send_to: 'AW-XXXXXXXX/XXXXXX' });
    }
  });
</script>
```

The component itself stays generic — no analytics inside it.

## Theming

The component uses Tailwind classes for layout and CSS variables for brand colors. Set on `:root` in your global CSS:

```css
:root {
  --codejitsu-modal-accent: #YOUR_BRAND;        /* button bg + focus ring */
  --codejitsu-modal-accent-hover: #DARKER;
  --codejitsu-modal-on-accent: #ffffff;          /* text on the button */
}
```

If you don't set them, defaults are blue (`#2563eb`).

## What must NOT be done

- **Don't put the modal in every page** — put it in a single layout that wraps all pages. Multiple instances per page break (duplicate DOM ids).
- **Don't hardcode EmailJS keys in the component invocation.** Read from `codejitsu.config.ts` so rotating keys touches one file.
- **Don't put `secretKey` or sensitive EmailJS values in the config.** Only the public key is safe to ship to the browser. EmailJS Service ID + Template ID + Public Key are all public.
- **Don't disable the honeypot.** It's invisible to humans and catches a meaningful slice of bot submissions for free.
- **Don't add analytics calls inside the modal.** Use the `codejitsu-contact-submitted` event from outside.
- **Don't replace the focus trap or Esc handler with custom logic.** Both are accessibility-required.

## Verify

- [ ] Modal opens when trigger clicked (any `data-codejitsu-contact-trigger`)
- [ ] Esc closes it
- [ ] Backdrop click closes it
- [ ] Tab cycles within the modal (focus trap)
- [ ] Required fields show `*` and HTML5 validation fires on empty submit
- [ ] Submit calls EmailJS and shows toast on success
- [ ] On submit success, `codejitsu-contact-submitted` event fires
- [ ] reCAPTCHA (if configured) blocks submit until completed
- [ ] Honeypot field is visually hidden (off-screen) and not focusable

Run `npx codejitsu audit` — the Forms group will detect the modal, count its fields, verify the JS submit hook is present.
