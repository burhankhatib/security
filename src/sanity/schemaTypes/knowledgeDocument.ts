import {defineField, defineType} from 'sanity'

export const knowledgeDocument = defineType({
  name: 'knowledgeDocument',
  title: 'Knowledge Document',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().min(4).max(160),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(320),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'text',
      rows: 24,
      description:
        'Optional manual override. Leave blank when uploading a file — the AI will extract text automatically during syncing.',
      validation: (rule) => rule.min(80).warning('Content is optional. Upload a file instead or ensure enough text if you choose to fill it.'),
    }),
    defineField({
      name: 'sourceFile',
      title: 'Reference File',
      type: 'file',
      options: {
        accept:
          'text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      description: 'Upload your knowledge source (plain text, Markdown, PDF, DOCX). The AI ingests this file during the knowledge sync.',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      options: {
        list: [
          {title: 'English', value: 'en'},
          {title: 'Arabic', value: 'ar'},
          {title: 'French', value: 'fr'},
          {title: 'Spanish', value: 'es'},
        ],
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'importance',
      title: 'Priority',
      type: 'string',
      initialValue: 'standard',
      options: {
        list: [
          {title: 'Critical', value: 'critical'},
          {title: 'High', value: 'high'},
          {title: 'Standard', value: 'standard'},
          {title: 'Reference', value: 'reference'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'internalNotes',
      title: 'Internal Notes',
      type: 'text',
      rows: 4,
      description: 'Optional notes for editors. Not exposed to the AI.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'summary',
    },
    prepare({title, subtitle}) {
      return {
        title,
        subtitle: subtitle?.substring(0, 96) ?? 'Knowledge base document',
      }
    },
  },
})

