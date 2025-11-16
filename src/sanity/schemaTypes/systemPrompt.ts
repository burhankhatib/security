import {defineField, defineType} from 'sanity'

export const systemPrompt = defineType({
  name: 'systemPrompt',
  title: 'System Prompt',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().min(3).max(160),
    }),
    defineField({
      name: 'description',
      title: 'Prompt',
      type: 'text',
      rows: 12,
      description: 'Full system prompt used to guide the Sentinel assistant.',
      validation: (rule) => rule.required().min(40),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
    },
    prepare({title, subtitle}) {
      return {
        title,
        subtitle: subtitle?.slice(0, 100) ?? 'Custom system prompt',
      }
    },
  },
})

