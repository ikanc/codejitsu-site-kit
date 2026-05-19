# Blog writing — Claude playbook

> Triggered when the user runs `/blog` (or `/blog <topic>`) in a Codejitsu site
> that has the kit's commands installed (`npx codejitsu blog:init`).
>
> The slash command file is a thin reference; this file is the actual playbook.

## Step 0 — Read site config

Open `codejitsu.config.ts` at the site root and locate the `blogWriter` block.

**If `blogWriter` is missing or empty**, STOP and tell the user:

> "The blogWriter config block isn't set up yet. Add this to your codejitsu.config.ts:
>
> ```ts
> blogWriter: {
>   tone: '<one-line voice description>',
>   about: '<what the company does + who it serves>',
>   audience: '<primary reader, e.g. BC homeowners planning HVAC>',
>   services: ['Service A', 'Service B'],
>   locations: ['City A', 'City B'],
> },
> ```
>
> The other fields (approvedTags, wordCount, imageStyle, pricing, seasonalRules,
> bannedPhrases) have sensible kit defaults. See `modules/blog-writer/CLAUDE.md`
> for the full shape."

Do not proceed without the block. Don't invent values.

Everything in there is **site-specific input** for what you're about to write:

- `tone` — voice + register (REQUIRED)
- `about` — what the company does, who it serves (REQUIRED)
- `audience` — primary reader (REQUIRED)
- `services` — names that map to `/services/<slug>/` (REQUIRED)
- `locations` — names that map to `/service-areas/<slug>/` (REQUIRED)
- `approvedTags` — exhaustive. If unset, derive from `blog.categories` in config OR ask the user once
- `wordCount` — `{ min, max, default }`. Kit default `{ 1200, 2500, 1800 }`
- `faqs` — `{ min, max }`. Kit default `{ 5, 8 }`
- `internalLinks` — `{ min, max }` per post. Kit default `{ 3, 6 }`
- `pricing` — `'brackets-only' | 'allowed' | 'never-mention'`. Kit default `'brackets-only'` for service businesses
- `seasonalRules` — free text; current date should respect this. Default: none
- `bannedPhrases` — refuse to write these. Kit default includes "In today's fast-paced world", "When it comes to", "Look no further", "In conclusion"
- `authorDefault` — frontmatter `author`. Default: `site.defaultAuthor` or `site.name`
- `cadenceDays` — for /blog-batch. Kit default `4`

Also detect the blog's frontmatter shape by reading `src/content.config.ts` and
ONE existing post in `src/content/blog/`. Use that exact shape for the new post.

## Step 1 — Gather inputs (interactive)

Use `AskUserQuestion` to gather these in order. If the user passed a topic as
`$ARGUMENTS`, skip Question 1.

### Question 1 — Topic & focus

```
header: "Topic"
question: "What is this blog post about?"
options:
  - "Industry guide" — Educational content the audience would search for
  - "How-to / tutorial" — Step-by-step instructions
  - "Comparison / vs" — Compare 2+ options on multiple attributes
  - "Troubleshooting" — Diagnose-and-fix walkthrough
  - "Seasonal / news" — Time-sensitive (rebate change, season prep, etc.)
```

### Question 2 — Length

```
header: "Length"
question: "How long?"
options:
  - "Short (400-600 words)" — Announcement, quick explainer
  - "Medium (800-1200 words)" — Single-question explainer
  - "Long (1500-2500 words)" — Default for SEO posts
  - "XL (2500+ words)" — Definitive guide
```

Default = the `wordCount.default` from config.

### Question 3 — Primary service + city focus

```
header: "Service + city"
question: "Which service and city is this anchored to?"
```

Two follow-ups (separate questions):
- Service options: derive from `blogWriter.services`
- City options: derive from `blogWriter.locations` (plus an "any/general" option)

These drive the internal-link choices later.

### Question 4 — Publish date

```
header: "Publish date"
question: "When should this go live?"
options:
  - "Today" — immediate publish
  - "Next available slot" — read recent posts in src/content/blog/, find the
    next open date in the existing cadence (e.g. 4-day gap), use that
  - "Custom date" — user types YYYY-MM-DD
```

## Step 2 — Outline + approval

Before writing prose, produce an outline:

```
TITLE: <working title>
SLUG:  <kebab-case>
DATE:  <YYYY-MM-DD>
TAGS:  <2-3 from approvedTags, primary first>
WORDS: <target word count>

OUTLINE:
  Intro (1-2 paragraphs)
  ## <H2 #1>
    2-3 paragraphs of [angle]
  ## <H2 #2>
    Includes a comparison table / bullet list of [items]
  ## <H2 #3>
    ...
  Closing CTA (modal + phone)
  FAQs (5-8): planned questions
```

Show the outline and **ask for approval before writing prose**. Adjust on
feedback. Don't proceed without approval.

## Step 3 — Write the post

Write the full post to `src/content/blog/<slug>.md`. Match the existing
frontmatter shape exactly (detected in Step 0).

### HARD RULES — apply to every post

1. **No em dashes anywhere.** Use ` - ` (regular dash with spaces around it).
2. **No H1 in markdown body.** Frontmatter `title` becomes the H1. Body starts
   with intro paragraph(s), then `## H2`.
3. **No "one-line H2 sections."** Every `## H2` must have at least
   **2-3 paragraphs**, not just a sentence + bullet list.
4. **At least one list per post.** Either a bullet list (3+ parallel items) or
   a numbered list (if order matters) or a markdown table (for comparisons).
   No exceptions — a wall-of-prose 2,000-word post is wrong. But also no
   slide-deck (every section ending in bullets).
5. **FAQ block** in frontmatter — `faqs.min` to `faqs.max` entries from config
   (default 5-8). Each FAQ = real question a reader would search; answer is
   2-4 sentences, concise and complete.
6. **Internal links** — `internalLinks.min` to `internalLinks.max` from config
   (default 3-6). Link to `/services/<slug>/`, `/service-areas/<slug>/`, and
   `/services/<slug>/<city>/` patterns. Don't link the same URL twice.
7. **Banned phrases** — if `bannedPhrases` is set in config, refuse them.
   Common offenders: "In today's fast-paced world…", "When it comes to…",
   "Look no further…", "In conclusion…".
8. **Pricing** — if `pricing: 'brackets-only'`, every price reference is a
   range with context. Never a single dollar figure. If `pricing: 'never-mention'`,
   omit pricing entirely.
9. **CTA** — closing paragraph includes a call-to-action. Two patterns:
   - Modal: `[text](#contact)` or trigger-class link
   - Phone: `[text](tel:+1...)` — use the actual number from `site.business.telephone`
   Best is one paragraph with both.
10. **Approved tags only.** Pick 2-3 from `blogWriter.approvedTags`. Primary
    tag first. **Never invent.** If nothing in `approvedTags` fits the topic,
    STOP and ask the user:
    > "None of your approved tags fit '<topic>'. Options: pick the closest fit
    > from <list>, OR add a new tag to `blogWriter.approvedTags` in
    > codejitsu.config.ts. Which?"
    Don't auto-add tags to the config.
11. **Image placeholder.** Frontmatter `image` field points to where the image
    WILL live: `<imageStyle.outputDir>/<slug>.webp`. The file doesn't exist
    yet; that's fine. Run `/blog-images` to generate prompts later.
12. **Seasonal awareness.** If `seasonalRules` is set, the topic + angle must
    fit the post's publish month. No "winterize" posts in July.

### Structure

- **Intro** — 1-2 paragraphs that hook on a real audience pain. Tie to a
  specific local concern when possible (the climate, regulation, market).
- **3-6 H2 sections** — each 2-3 paragraphs minimum. Mix prose, lists, and
  tables. Roughly:
  - Prose carries narrative + explanation in most sections
  - 1-3 bullet lists where content is genuinely parallel items
  - A markdown table for 2+ option comparisons (when it's a vs/comparison post)
  - Numbered list only when order matters
- **H3 sub-sections** within H2s where useful.
- **Closing paragraph** with CTA.
- **FAQ block** in frontmatter.

### Tone

Read `blogWriter.tone` and `blogWriter.audience` from config. Match
exactly. Examples:

- "professional but friendly, confident not boastful" → don't oversell, don't joke
- "BC HVAC pro, plain-spoken, technical when needed" → mix terms-of-art with plain explanations
- "Zen calm, helpful, occasional humour" → workzen's signature

## Step 4 — Verify after writing

After writing the file, **actively run these checks** by reading the file back
and counting. Don't skip. If any fail, fix in place before reporting Step 5.

- Word count is within `wordCount` target (count after stripping frontmatter)
- FAQ count in frontmatter is within `faqs.min`-`faqs.max`
- Internal links count: grep for `](/services/` and `](/service-areas/` in body
- Tags are all from `approvedTags`
- **No em dashes**: grep body for `—` and `–` — neither should appear
- **No H1 in body**: first non-frontmatter line is NOT `# ...`
- **No `bannedPhrases`**: grep body for each banned phrase
- **Pricing policy**: if `'brackets-only'`, grep for standalone `$<digits>` not in a range
- **Frontmatter shape**: matches existing posts in `src/content/blog/`
- **At least one list**: body contains `- `, `1. `, OR `|` (markdown table)

If any check fails, **fix the file then re-verify**. Surface unfixable issues
to the user before reporting Step 5.

## Step 5 — Report back

Tell the user:
- Path to the new file
- Word count
- Tag selection + why
- Whether image needs generating (point at `/blog-images`)
- Whether the post is published immediately or scheduled (based on date)

Don't push or commit unless explicitly asked.
