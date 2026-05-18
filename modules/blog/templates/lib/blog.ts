import { createBlog, type BlogCategory } from '@ibalzam/codejitsu-core/blog';

const categories: BlogCategory[] = [
  // {
  //   slug: 'guides',
  //   tag: 'Guides',
  //   title: 'Guides',
  //   subtitle: 'Practical how-tos',
  //   metaDescription: '...',
  // },
];

export const blog = createBlog({
  contentDir: 'content/blog',
  defaultAuthor: 'TODO: Site Author',
  categories,
});
