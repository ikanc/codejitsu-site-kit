# Contact module — checklist

## Setup

- [ ] `codejitsu.config.ts` has a `contact.emailjs` block with serviceId, templateId, publicKey.
- [ ] (Optional) `contact.recaptcha.siteKey` set if site uses reCAPTCHA.
- [ ] EmailJS template variables match what the modal sends: `name`, `email`, `phone`, `message`.

## Wiring

- [ ] Exactly **one** `<ContactModal>` per page (placed in a layout that wraps every page).
- [ ] At least one trigger exists with `data-codejitsu-contact-trigger`.
- [ ] (If site has GA4/Ads) A `codejitsu-contact-submitted` event listener fires the conversion.

## Behaviour (manual or browser-tested)

- [ ] Modal opens when trigger clicked.
- [ ] Esc closes it.
- [ ] Backdrop click closes it.
- [ ] Tab cycles within the modal (focus trap).
- [ ] First field gets focus when opened.
- [ ] Required fields show `*` and HTML5 validation blocks empty submit.
- [ ] Submit shows "Sending…" state on the button.
- [ ] Successful submit shows the thank-you toast.
- [ ] Failed submit shows an error alert.

## Spam protection

- [ ] Honeypot input present at `name="cj_hp_website"`, off-screen, `tabindex="-1"`.
- [ ] If reCAPTCHA configured: widget visible inside the form, submit blocked until solved.

## Theming

- [ ] Site's `:root` CSS sets `--codejitsu-modal-accent` (otherwise it uses default blue).
- [ ] Modal's image (if used) is in `public/` and < 200KB.
