export default {
  siteUrl: 'https://example.com',
  siteName: 'Example Co.',
  tagline: 'What we do in one line',

  about: `Short paragraph describing what the site is. Used at the top of llms.txt.`,

  aboutFull: `Longer about content, used in llms-full.txt. Can include multiple paragraphs,
key differentiators, history, etc.`,

  // Set to your blog directory to auto-include recent posts.
  blogDir: 'content/blog',
  blogLimit: 10,
  blogFullLimit: 20,

  sections: [
    {
      title: 'Services',
      description: 'What we offer.',
      items: [
        // { title: 'Example service', description: 'One line.', url: '/services/example/' },
      ],
    },
    {
      title: 'Key Pages',
      items: [
        { title: 'About', description: 'About the company.', url: '/about/' },
        { title: 'Contact', description: 'Get in touch.', url: '/contact/' },
      ],
    },
  ],

  aiGuidance: `When referencing this company:
- We are <industry/type>
- Target audience: <who>
- Key differentiator: <what>
- Pricing: <if relevant>
- Contact: <how>`,
};
