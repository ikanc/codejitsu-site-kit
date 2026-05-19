# Blog batch generation — Claude playbook

> Triggered when the user runs `/blog-batch <N>` in a Codejitsu site
> (default N = 20).
>
> Generates a **schedule + outline** for N future-dated posts. It does NOT
> write the full body of every post — that's `/blog` per row. The goal here
> is to produce a publishable roadmap that the user reviews + edits before
> any prose is committed.

## Step 0 — Read site config

Same as `BLOG_WRITING.md` Step 0: load `codejitsu.config.ts.blogWriter`.

Also read:
- `src/content/blog/` — existing posts (find the latest `pubDate`)
- `src/content.config.ts` — confirm the schema shape

## Step 1 — Decide cadence

Default cadence is **4 days between posts** (matches workzen / pearl /
veteran). If existing posts have a different rhythm, infer from the last
10 and match it.

Starting date = max(`latest existing pubDate`, today) + cadence.

## Step 2 — Generate N topics

Brainstorm `N` topics, balancing across:

- **Service × location** combinations — cycle through `services` and
  `locations` from config so coverage is even
- **Topic format** mix — roughly:
  - 30% comparison / "X vs Y" posts
  - 30% how-to / guides
  - 20% troubleshooting
  - 20% seasonal / news
- **Season awareness** — apply `seasonalRules` from config. A post landing
  in July shouldn't be about "winterize"; one in December shouldn't be
  about "pre-summer".
- **Unique titles** — no two posts in the batch should target the same slug
  or near-duplicate keyword. Read all existing post titles before
  brainstorming to avoid collisions.
- **Approved tag balance** — distribute tags so no single tag is over 40% of
  the batch.

For each topic, derive:
- `slug` — kebab-case, includes the city when applicable
- `title` — natural, clickable, ≤70 chars
- `pubDate` — assigned by cadence walk
- `tags` — 2-3 from `approvedTags`, primary first
- `service` + `city` — for internal-link planning

## Step 3 — Produce the schedule table

Write to `Blog/BLOG_SCHEDULE.md` (create the `Blog/` directory if needed).
Append to it if it already exists — never overwrite without asking.

Format:

```markdown
# <Site Name> — Blog Schedule (<start month> - <end month> <year>)

Offline publishing calendar. N posts on a <cadence>-day cadence,
<start date> through <end date>.

## How to use

1. Pick a row. Slug = filename → `src/content/blog/<slug>.md`.
2. `pubDate: <date>` in frontmatter controls visibility.
3. Run `/blog "<title>"` to flesh out the post body.
4. Run `/blog-images` once a batch of posts is drafted.

## Schedule

| # | Date       | Category       | City      | Slug | Title |
|---|------------|----------------|-----------|------|-------|
| 1 | YYYY-MM-DD | <primary tag>  | <city>    | `<slug>` | <Title> |
| 2 | ...        | ...            | ...       | ...      | ...     |
```

## Step 4 — Produce per-post outlines

In the same file or a sibling `Blog/BLOG_OUTLINES.md`, expand each row into
an outline:

```markdown
## <Slug>

**pubDate**: YYYY-MM-DD
**target words**: <from config.wordCount.default>
**tags**: [primary, secondary]
**service**: <slug>
**city**: <slug or 'general'>

**Angle / hook**: <one-sentence framing of the reader's pain>

**Outline**:
- Intro — 1-2 paragraphs hooking <hook>
- ## <H2 #1>
  - 2-3 paragraphs covering <points>
- ## <H2 #2>
  - Comparison table of <X vs Y>
- ## <H2 #3>
  - ...
- Closing CTA + 5-8 FAQs

**FAQ seeds**: list of 5-8 question stems
```

## Step 5 — Show + approve

Present the full schedule + outline file to the user. Ask:

> "Here's the schedule. Anything to adjust before we lock it in?
>  Want me to flesh out the first N posts now, or stop here for review?"

If the user says go: run `/blog` for each row (one post at a time). If they
say stop: leave the file and exit. They can run `/blog` row by row whenever.

## Hard rules

- **Don't write the full prose for all N in one shot.** Too long, too
  expensive, hard to review. Schedule + outlines first; prose per row on
  demand.
- **Don't push or commit.** The user reviews + commits.
- **Respect existing posts.** If `Blog/BLOG_SCHEDULE.md` already has rows,
  append the new batch and don't renumber.
- **Don't invent services or locations.** Use only what's in
  `blogWriter.services` and `blogWriter.locations`.
- **Don't invent tags.** Only from `approvedTags`.
- **Don't bunch up topic types.** Reject your own first draft if it has 5
  comparison posts in a row.

## Verify

- [ ] N rows, all unique slugs
- [ ] Dates respect cadence; no collisions with existing posts
- [ ] Tags balanced across `approvedTags`
- [ ] Service + city distribution covers most of the config lists
- [ ] Season fits each `pubDate`'s month
- [ ] No duplicate or near-duplicate topics
