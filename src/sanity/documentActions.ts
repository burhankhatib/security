import type {
  DocumentActionComponent,
  DocumentActionProps,
  DocumentActionDescription,
  DocumentActionsContext,
  DocumentActionsResolver,
} from 'sanity'

const UnpublishAction: DocumentActionComponent = (props: DocumentActionProps) => {
  return {
    label: 'Unpublish',
    shortcut: 'mod+shift+u',
    onHandle: () => {
      const unstable = (props as {
        unstable?: {actions?: {unpublish?: {execute: () => void}}}
      }).unstable
      unstable?.actions?.unpublish?.execute()
      props.onComplete()
    },
  } satisfies DocumentActionDescription
}

export const documentActions: DocumentActionsResolver = (
  prev: DocumentActionComponent[],
  context: DocumentActionsContext,
) => {
  if (context.schemaType !== 'knowledgeDocument') {
    return prev
  }

  const hasUnpublish = prev.some((action) => action?.action === 'unpublish')
  if (hasUnpublish) {
    return prev
  }

  const duplicateIndex = prev.findIndex((action) => action?.action === 'duplicate')

  if (duplicateIndex >= 0) {
    const updated = [...prev]
    updated.splice(duplicateIndex + 1, 0, UnpublishAction)
    return updated
  }

  return [...prev, UnpublishAction]
}


