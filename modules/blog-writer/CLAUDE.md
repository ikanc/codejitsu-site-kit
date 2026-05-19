# Blog writer module — instructions for Claude

When the user asks to **set up blog writing** or **add the codejitsu blog
writer** to a site, do the following.

## What this module provides

A robust blog-writing workflow driven by per-site config + three slash
commands in the user's `.claude/commands/`. The slash commands themselves
are **thin references** to playbooks that live in the package — so updates
flow through `npm update` without re-copying anything.

**Files in this module:**

- `BLOG_WRITING.md` — single-post playbook (driven by `/blog`)
- `BLOG_BATCH.md` — schedule + outline N posts (driven by `/blog-batch <N>`)
- `BLOG_IMAGES.md` — generate image prompts for pending posts (driven by `/blog-images`)
- `templates/.claude/commands/*.md` — thin slash command files that the
  site keeps in its repo (copied once via `codejitsu blog:init`)

**Config block in `codejitsu.config.ts`:**

```ts
blogWriter: {
  tone: 'professional, plain-spoken, confident not boastful',
  about: 'Veteran Heating and Cooling is a Chilliwack HVAC contractor...',
  audience: 'BC Lower Mainland homeowners planning HVAC upgrades',
  services: ['Heat Pump Installation', 'Furnace Installation', ...],
  locations: ['Vancouver', 'Burnaby', 'Surrey', ...],
  approvedTags: ['rebates-savings', 'buying-guides', 'troubleshooting', 'seasonal-care', 'home-comfort'],
  wordCount: { min: 1200, max: 2500, default: 1800 },
  faqs: { min: 5, max: 8 },
  internalLinks: { min: 3, max: 6 },
  pricing: 'brackets-only',
  seasonalRules: 'July-Sep: heat-wave + AC topics. Oct-Nov: pre-winter prep...',
  bannedPhrases: ["In today's fast-paced world", "When it comes to", "Look no further"],
  authorDefault: 'Veteran HVAC',
  imageStyle: {
    description: 'Photorealistic real-estate / architectural photography of HVAC equipment + BC home interiors. Bright natural daylight, modern Lower Mainland aesthetic, no people unless they wear branded uniform.',
    branding: 'Logo small in bottom-right corner. No other brand marks.',
    outputDir: 'public/assets/blog',
    maxWords: 60,
    realism: 'photorealistic',
  },
},
```

## Wiring it into a site

### 1. Configure `blogWriter` in `codejitsu.config.ts`

Fill in the block above. Take care with:
- `approvedTags` — exhaustive list. The commands will refuse to invent new tags.
- `imageStyle.description` — be specific. This is the seed for every image prompt.
- `seasonalRules` — free text. The batch generator reads this to balance topics by month.
- `bannedPhrases` — common AI tells.

### 2. Run `codejitsu blog:init`

```bash
npx codejitsu blog:init
```

Copies the three slash command files into `.claude/commands/`:
- `blog.md`
- `blog-batch.md`
- `blog-images.md`

Each is a one-line reference pointing at the matching playbook in
`node_modules/@ibalzam/codejitsu-core/modules/blog-writer/`. **Sites should
not edit these files.** Updates to the playbooks ship via `npm update`.

### 3. Use in Claude Code

```
/blog                          # single post, interactive
/blog "tankless water heater"  # single post with topic seeded
/blog-batch 20                 # schedule + outline 20 future posts
/blog-images                   # image prompts for next 10 pending posts
/blog-images 30                # for next 30
```

## How the slash commands work

Each `.claude/commands/blog.md` looks like:

```md
---
description: Codejitsu blog writer
argument-hint: [optional topic]
---

Open `node_modules/@ibalzam/codejitsu-core/modules/blog-writer/BLOG_WRITING.md`
and follow it top-down. The playbook reads site-specific tone, services,
locations, and rules from `codejitsu.config.ts`.

Topic provided: $ARGUMENTS
```

When the user runs `/blog`, Claude Code feeds this file's contents as the
prompt. Claude reads BLOG_WRITING.md from the installed package and follows
that playbook. **The actual writing rules live in the package**, not in the
site's repo — that's the robust part.

## Conflict with existing site blog instructions

Some Codejitsu sites already have `.claude/BLOG_INSTRUCTIONS.md` (pearl,
workzen) — older bespoke instructions written before the kit existed.
After running `blog:init`, the site has BOTH:
- The kit's `/blog` command → reads BLOG_WRITING.md in the package
- The site's `.claude/BLOG_INSTRUCTIONS.md` → may be referenced by Claude
  ambiently when the site is open

**Resolution when adopting the kit on such a site:**
1. Read the existing `.claude/BLOG_INSTRUCTIONS.md`. Identify what's
   genuinely site-specific (specific tone phrasings, special pricing
   rules, internal link patterns).
2. Move those site-specific bits into `codejitsu.config.ts.blogWriter`
   (or `seasonalRules` / `bannedPhrases` fields).
3. Delete or rename the old `.claude/BLOG_INSTRUCTIONS.md` to
   `.claude/BLOG_INSTRUCTIONS.archived.md` so it doesn't get auto-loaded.
4. Keep only the kit's slash command files in `.claude/commands/`.

This avoids the "two contradicting instruction sources" problem.

## What must NOT be done

- **Don't copy the playbook contents into the site.** The slash command
  should be a thin reference. If a site has hand-edited BLOG_WRITING.md
  copy, it drifts from the package over time. Reference only.
- **Don't write posts that invent tags.** Only `approvedTags` are valid.
- **Don't break the 5-dash separator** for image prompts. Markdown's `---`
  is the wrong separator — use `-----` literally.
- **Don't run `/blog-batch` with N > 50.** Too many posts in one batch
  bunches topics and degrades quality. Three batches of 20 is better.
- **Don't generate prose for all N in `/blog-batch`.** Schedule + outlines
  only. Prose per row via `/blog`.
- **Don't push or commit blog posts without user permission.**

## Verify after setup

- [ ] `codejitsu.config.ts` has the full `blogWriter` block
- [ ] `.claude/commands/blog.md`, `blog-batch.md`, `blog-images.md` exist
- [ ] Each command is a one-line reference (don't edit)
- [ ] `node_modules/@ibalzam/codejitsu-core/modules/blog-writer/BLOG_WRITING.md` exists
- [ ] Running `/blog` in Claude Code opens the writer (test with a throwaway topic)
