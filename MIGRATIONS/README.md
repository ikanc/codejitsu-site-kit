# Migrations

When `@ibalzam/codejitsu-core` ships a change that requires touching site-owned files (page routes, config, content), the change is described here as prose Claude reads and applies.

## Format

One file per version: `MIGRATIONS/<version>.md`. Example: `MIGRATIONS/0.2.0.md`.

Each file follows this structure:

```markdown
# 0.2.0

## Summary
One paragraph: what changed and why.

## Required actions
Numbered list of concrete things to do in the site. Reference file paths and code snippets. Be specific enough that Claude can apply them without ambiguity.

## Verify
What to check after applying.
```

## Why prose, not codemods

We do migrations through Claude reading the notes, not jscodeshift. Trade-off: prose is more flexible (handles edge cases, branding variations, half-applied previous migrations) but requires Claude to actually be in the loop on the upgrade. That matches how this package is meant to be used — every Codejitsu site is maintained with Claude, so Claude can read and apply.

## When NOT to write a migration

Most upgrades don't need one. If a change can live entirely in library code (a new component, a fixed function, an Astro integration hook that injects something automatically), ship it as a package update and let `npm update` propagate. Only write a migration when site-owned files must change.
