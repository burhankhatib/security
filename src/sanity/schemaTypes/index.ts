import {type SchemaTypeDefinition} from 'sanity'

import {knowledgeDocument} from './knowledgeDocument'
import {systemPrompt} from './systemPrompt'

export const schema: {types: SchemaTypeDefinition[]} = {
  types: [knowledgeDocument, systemPrompt],
}
