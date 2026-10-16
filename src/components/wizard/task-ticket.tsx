'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { AcceptanceCriterion, Task } from '@/lib/domain/types'
import { ticketMarkdown } from '@/lib/wizard/ticket-markdown'

export function TaskTicket({ task, acs }: { task: Task; acs: AcceptanceCriterion[] }) {
  const markdown = ticketMarkdown(task, acs)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{markdown}</pre>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? 'Copied' : 'Copy as Markdown'}
        </Button>
      </CardContent>
    </Card>
  )
}
