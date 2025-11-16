import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'crawlSource',
  title: 'Crawl Sources',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Source Name',
      type: 'string',
      validation: (rule) => rule.required().min(3).max(100),
      description: 'Friendly name for this crawl source (e.g., "OWASP Cheat Sheets", "Mozilla Security")',
    }),
    defineField({
      name: 'url',
      title: 'Website URL',
      type: 'url',
      validation: (rule) => 
        rule.required().uri({
          scheme: ['http', 'https'],
        }),
      description: 'The website URL to crawl for security content',
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
      description: 'Enable/disable this crawl source',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Optional: What kind of content does this source provide?',
    }),
    defineField({
      name: 'order',
      title: 'Crawl Order',
      type: 'number',
      initialValue: 0,
      description: 'Order in which sources are crawled (lower numbers first)',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'url',
      active: 'active',
    },
    prepare({title, subtitle, active}) {
      return {
        title: `${active ? '✅' : '⏸️'} ${title}`,
        subtitle: subtitle,
      }
    },
  },
})

