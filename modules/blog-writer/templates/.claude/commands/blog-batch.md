---
description: Codejitsu blog batch — schedule + outline N future-dated posts
argument-hint: [N — number of posts, default 20]
---

Open `node_modules/@ibalzam/codejitsu-core/modules/blog-writer/BLOG_BATCH.md` and follow it top-down.

The playbook generates a schedule + outline (NOT full prose) for the next N posts, reading services, locations, tags, cadence rules, and seasonal awareness from `codejitsu.config.ts`. Prose per row is filled in via `/blog`.

N provided: $ARGUMENTS
