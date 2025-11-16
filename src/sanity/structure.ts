import type {StructureResolver} from 'sanity/structure'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Crawl Sources')
        .schemaType('crawlSource')
        .child(S.documentTypeList('crawlSource').title('Crawl Sources')),
      S.divider(),
      S.listItem()
        .title('Knowledge Base')
        .schemaType('knowledgeDocument')
        .child(S.documentTypeList('knowledgeDocument').title('Knowledge Documents')),
      S.listItem()
        .title('System Prompts')
        .schemaType('systemPrompt')
        .child(S.documentTypeList('systemPrompt').title('System Prompts')),
      ...S.documentTypeListItems().filter(
        (item) => !['knowledgeDocument', 'systemPrompt', 'crawlSource'].includes(item.getId() ?? ''),
      ),
    ])
