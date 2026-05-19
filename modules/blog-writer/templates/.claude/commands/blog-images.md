---
description: Codejitsu blog image prompts — generate AI-image prompts for pending posts
argument-hint: [N — number of prompts, default 10]
---

Open `node_modules/@ibalzam/codejitsu-core/modules/blog-writer/BLOG_IMAGES.md` and follow it top-down.

The playbook reads `blogWriter.imageStyle` from `codejitsu.config.ts` (style description, branding, output dir, max words, realism) and generates prompts in the **5-dash separator format** (not the markdown `---` HR — use `-----` literally).

Output goes to `Blog/IMAGE_PROMPTS.md`. Appends to existing file — never overwrites.

N provided: $ARGUMENTS
