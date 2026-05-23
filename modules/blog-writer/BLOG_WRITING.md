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
- `approvedTags` — **REQUIRED for writing; the single controlled vocabulary**
  (hard cap: 12 per site). Governs BOTH `category` and `tags` fields. If unset,
  STOP and ask the user to define up to 12 (or derive from the `category` enum
  in `src/content.config.ts`). Never write a post with a tag outside this list.
- `wordCount` — `{ min, max, default }`. Kit default `{ 1200, 2500, 1800 }`
- `faqs` — `{ min, max }`. Kit default `{ 5, 8 }`
- `internalLinks` — `{ min, max }` per post. Kit default `{ 3, 6 }`
- `pricing` — `'brackets-only' | 'allowed' | 'never-mention'`. Kit default `'brackets-only'` for service businesses
- `seasonalRules` — free text; current date should respect this. Default: none
- `bannedPhrases` — refuse to write these. Kit default includes "In today's fast-paced world", "When it comes to", "Look no further", "In conclusion"
- `authorDefault` — frontmatter `author`. Default: `site.defaultAuthor` or `site.name`
- `cadenceDays` — for /blog-batch. Kit default `4`

Also detect the blog's frontmatter shape by reading `src/content.config.ts` and
ONE existing post in `src/content/blog/`. **Match the frontmatter field SHAPE
(which fields exist), but NOT the body format and NOT the field VALUES.**

**Body format: always write clean markdown.** Use `## H2`, `- bullets`,
`1. numbered`, `| markdown | tables |`, `**bold**`. Do this EVEN IF existing
posts have HTML in the body. Some sites (veteran) were WordPress-imported with
raw HTML bodies inside their `.md` files. That is legacy, not the target.
Astro renders markdown and inline-HTML identically, so a new markdown post sits
fine alongside old HTML ones. Never copy `<p>`, `<h2>`, `<table>` from an
existing post — write markdown.

Critical distinction for taxonomy fields (`category`, `tags`):
- A schema may have `category` (an enum — constrained) AND/OR `tags` (a free
  array). Both are taxonomy.
- `blogWriter.approvedTags` governs **every taxonomy field**. Put approved
  values in `category` AND in `tags`.
- **Do NOT copy free-form tag values from existing posts.** Many sites were
  WordPress-imported with proliferated tags (every city, every appliance as a
  tag). That sprawl is exactly what `approvedTags` exists to stop. Match the
  field structure of old posts, ignore their messy values.
- If `category` is an enum, pick the one approved value that fits. If `tags`
  is a free array, fill it from `approvedTags` only — not invented descriptors.

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

**Match the tier to the topic's natural scope — don't rubber-stamp the config
default.** A focused 2-option comparison or a single-question explainer is
usually Medium. A multi-angle definitive guide is Long or XL. Defaulting every
post to "Long" produces either thin Long posts or padded ones.

Rough mapping:
- Comparison / "X vs Y" (2-3 options) → Medium (800-1200), occasionally Long
- Single troubleshooting walkthrough → Medium (800-1200)
- How-to / multi-step guide → Long (1500-2500)
- Industry/buying guide covering many sub-topics → Long (1500-2500)
- Definitive "everything about X" → XL (2500+)

**The real quality bar is structural density + depth, NOT raw word count.**
A post passes if every H2 has 2-3 real paragraphs, there's at least one
list/table, and nothing reads thin. Never pad to hit a number — efficient,
complete writing at 1200 words beats 1800 words of filler every time.

**To make Long / XL posts genuinely long, add DEPTH, not words:**
- At least one worked example or named scenario ("a Surrey homeowner switching
  from a 15-year-old gas furnace stacked CleanBC + BC Hydro to land at roughly
  X after rebates") — concrete, not abstract.
- Real specifics: model families, actual process steps, real numbers inside
  narratives, real local detail.
- Granular sub-sections (H3s) where a topic has genuine sub-parts.
- Show the concept applied, don't just define it.

If a Long post comes in short, the fix is "what concrete example or applied
detail is missing?" — never "add more adjectives." If after adding genuine
depth the post is still ~1200 words and complete, it was a Medium topic;
relabel it and move on. Do not pad.

`wordCount` in config is a loose sanity band, not a target to chase.

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
   (default 3-6). **Target the MIDDLE of the range, not the floor.** For a
   3-6 range, aim for 4-5. Link the FIRST mention of each distinct city and
   service in the body. A post that names a city six times but links it once
   is under-linked — link the first occurrence. Don't link the same URL twice;
   don't stuff. Patterns: `/services/<slug>/`, `/service-areas/<slug>/`,
   `/services/<slug>/<city>/`.
7. **Banned phrases** — if `bannedPhrases` is set in config, refuse them.
   Common offenders: "In today's fast-paced world…", "When it comes to…",
   "Look no further…", "In conclusion…".
8. **Pricing** — applies only to `pricing: 'brackets-only'`:
   - **Service-cost CLAIMS must be bracket ranges with context.** What a
     job/install/repair/service costs is always a range:
     "a furnace replacement typically runs $6,500 - $10,000 depending on
     venting and efficiency." Never a single figure for a cost claim.
   - **Narrative examples may be specific.** A hypothetical scenario, a
     story about one homeowner's invoice, or a comparison walkthrough can use
     a specific number because it references a *scenario*, not a price claim:
     "the technician quoted $1,400 for the control board" is fine inside a
     decision-making narrative. When in doubt, bracket it.
   - If `pricing: 'never-mention'`, omit all pricing.
9. **CTA** — closing paragraph includes a call-to-action. Two patterns:
   - Modal: `[text](#contact)` or trigger-class link
   - Phone: `[text](tel:+1...)` — use the actual number from `site.business.telephone`
   Best is one paragraph with both.
10. **Approved tags only — for ALL taxonomy fields, hard cap 12.** `approvedTags`
    is the single controlled vocabulary, max 12 per site. It governs both
    `category` (if the schema has an enum) and `tags` (if the schema has a free
    array). Put `approvedTags` values in both. Pick 2-3, primary first.
    **Never invent, even if existing posts use free-form tags.** WordPress
    imports often have proliferated tags (cities, appliance types) — that
    sprawl is exactly what `approvedTags` prevents. Match the field *shape* of
    old posts, not their values.

    **If nothing in `approvedTags` fits the topic**, STOP and ask:
    > "None of your approved tags fit '<topic>'. Either: (a) pick the closest
    > from <list>, or (b) add a new approved tag. You currently have <N>/12.
    > [If N < 12:] I can add '<proposed>' to blogWriter.approvedTags. [If N = 12:]
    > You're at the 12-tag cap — to add one, tell me which existing tag to remove."

    Only add a tag to the config with explicit user approval, and never exceed
    12. Don't auto-add.
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

- **Structural density (the real bar):** every H2 has 2-3 paragraphs; at least
  one list or table; no section reads thin. This matters more than word count.
- Word count is a SOFT signal, not a gate. Do not pad to hit it. If a post
  intended as Long lands short, ask "what concrete example / applied detail
  is missing?" and add depth — OR accept it was a Medium topic and relabel.
  Never add filler to chase a number. A dense, complete 1200-word post passes.
- FAQ count in frontmatter is within `faqs.min`-`faqs.max`.
- **Internal links — mechanical check, do this explicitly:**
  1. List every distinct service AND city you named in the body.
  2. You should have linked the FIRST mention of each (up to `internalLinks.max`).
  3. Count your actual `](/services/` + `](/service-areas/` links.
  4. If the count is below the range midpoint AND you have named-but-unlinked
     services/cities, add those links now. Don't ship at the floor when you
     mentioned linkable things and skipped them.
  Example failure: post discusses heat pumps, furnaces, AND air conditioning
  but only links two of them — link the third.
- **Every taxonomy field uses `approvedTags`**: check BOTH `category` and
  `tags` in the frontmatter. If `tags` contains any value not in
  `approvedTags` (e.g. a city name or appliance copied from old posts),
  that's a fail — replace with approved values.
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
