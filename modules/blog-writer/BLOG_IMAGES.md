# Blog image prompts — Claude playbook

> Triggered when the user runs `/blog-images` (or `/blog-images <N>`) in a
> Codejitsu site.
>
> Generates AI-image-generation prompts for blog posts that don't have their
> images yet. Output goes to `Blog/IMAGE_PROMPTS.md` in the **5-dash separator
> format**.

## Step 0 — Read site config

Open `codejitsu.config.ts` and locate `blogWriter.imageStyle`. Use:

- `imageStyle.description` — the full prompt-style description of the visual
  style (photorealistic / cartoon / illustration / etc., palette, framing)
- `imageStyle.branding` — branding rule (e.g. "logo small in bottom-right")
- `imageStyle.outputDir` — where the final .webp will live
- `imageStyle.maxWords` — cap on prompt length (typical ≤60)
- `imageStyle.realism` — `'photorealistic' | 'illustration' | 'cartoon' | 'mixed'`

## Step 1 — Find the posts to prompt

Default `N = 10` if not specified. Scan `src/content/blog/` and pick posts
that:

1. Have `pubDate > today` (pending / scheduled), OR
2. Are missing an image file at `<imageStyle.outputDir>/<slug>.webp`

Sort by `pubDate` ascending. Take up to N.

If nothing matches → tell the user "no pending posts need images" and stop.

## Step 2 — Generate prompts

For each post, write a prompt ≤`maxWords` words that:

- Captures the **specific topic** of the post (e.g. a comparison post should
  show both materials, a city-anchored post should hint at the city's
  setting)
- Follows the style + branding from `imageStyle`
- References any specific materials, fixtures, or settings mentioned in the
  post title
- **Doesn't** include text, captions, watermarks, or competitor brand names
- **Doesn't** specify image dimensions (the image generator decides)

If `imageStyle.realism === 'photorealistic'`, prompts emphasize architecture,
lighting, real materials, magazine-quality framing.

If `imageStyle.realism === 'cartoon'`, prompts emphasize character design,
flat colors, friendly tone.

## Step 3 — Output format

Write to `Blog/IMAGE_PROMPTS.md` (create the `Blog/` directory if absent).
Append if the file exists — never overwrite existing prompts.

The format is **EXACTLY**:

```
**<Post Title>**
<prompt text>

-----

**<Post Title>**
<prompt text>

-----

**<Post Title>**
<prompt text>
```

### Format rules — strict

- Separator is **exactly 5 dashes** on their own line: `-----`. Not 3, not 7.
  Markdown's `---` is wrong here; use `-----` literally.
- Separator appears **between entries**, never after the last one.
- Title goes on its own line in **bold** (with `**...**`).
- Prompt goes directly below the title line, no blank line between them.
- Blank line before each separator, blank line after.
- No numbering.
- No dimensions in the prompt text.
- The output file goes to `imageStyle.outputDir/<slug>.webp` (note this
  convention in a one-line header at the top of the file, not in each
  prompt).

## Step 4 — Header for the file

Top of `Blog/IMAGE_PROMPTS.md`:

```markdown
# <Site Name> — Blog Image Prompts (Posts <range>)

Generated against `modules/blog-writer/BLOG_IMAGES.md` from `<Site Name>`'s
`codejitsu.config.ts.blogWriter.imageStyle`.

Style: <one-line summary derived from imageStyle.description>.
Output file convention: each image saves to `<outputDir>/<slug>.webp`.

---
```

(That `---` IS markdown HR — it's the only 3-dash separator in the file,
separating the header from the prompts. Everything between prompt entries is
`-----`.)

## Hard rules

1. **Separator is `-----` (5 dashes).** Not 3.
2. **No numbering** of entries.
3. **No dimensions** in the prompt text.
4. **No competitor brand names** in any prompt.
5. **No text / captions / watermarks inside the image** unless the style
   description explicitly allows it.
6. **Append, don't overwrite.** If the user has a prior prompts file, add new
   entries below; never delete or rewrite existing prompts.
7. **One prompt per post.** Don't generate alternatives unless asked.

## Verify

- [ ] N prompts produced (or fewer if not enough pending posts)
- [ ] Every separator is exactly 5 dashes
- [ ] Last entry has NO trailing separator
- [ ] No prompt exceeds `maxWords`
- [ ] Each prompt references the post's specific topic + city if applicable
- [ ] Output file path is `Blog/IMAGE_PROMPTS.md`
