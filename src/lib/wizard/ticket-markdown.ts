import type { AcceptanceCriterion, Task } from '@/lib/domain/types'

type TicketTask = Pick<Task, 'id' | 'title' | 'intent' | 'storyId' | 'dependsOn'>

/** A generated task as the short ticket from README §3.2, ready to paste for an agent. */
export function ticketMarkdown(task: TicketTask, acs: AcceptanceCriterion[]): string {
  const meta = [`Story: ${task.storyId}`, ...(task.dependsOn.length > 0 ? [`Depends on: ${task.dependsOn.join(', ')}`] : [])].join(' · ')
  return [
    `${task.id} · ${task.title}    ${meta}`,
    '',
    task.intent,
    '',
    'Acceptance criteria',
    ...acs.map((a) => `- [ ] ${a.id} ${a.text}${a.humanTest ? '   👤 human test' : ''}`),
    '',
    `PR: put \`${task.id}\` in the title and use the standard sections (Summary, Migration,`,
    'Test plan, Notes). Copy the ACs into "Test plan", tick each one you tested and',
    'say how (unit / integration / e2e). Leave 👤 items unticked for a human.',
  ].join('\n')
}
