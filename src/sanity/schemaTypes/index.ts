import {type SchemaTypeDefinition} from 'sanity'

import {knowledgeDocument} from './knowledgeDocument'
import {systemPrompt} from './systemPrompt'
import crawlSource from './crawlSource'

export const schema: {types: SchemaTypeDefinition[]} = {
  types: [knowledgeDocument, systemPrompt, crawlSource],
}
