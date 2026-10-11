/** shadcn/ui Collapsible primitive on the IAMAimpresa tokens. Part of the IAMAimpresa design system. */
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'

function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return <CollapsiblePrimitive.CollapsibleTrigger data-slot='collapsible-trigger' {...props} />
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return <CollapsiblePrimitive.CollapsibleContent data-slot='collapsible-content' {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
