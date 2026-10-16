import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlannerBrief } from '@/lib/domain/planner'

const FIELDS: { key: 'name' | 'goal' | 'users' | 'constraints' | 'tech' | 'nonGoals'; label: string }[] = [
  { key: 'name', label: 'Project name' },
  { key: 'goal', label: 'Goal' },
  { key: 'users', label: 'Users' },
  { key: 'constraints', label: 'Constraints' },
  { key: 'tech', label: 'Tech preferences' },
  { key: 'nonGoals', label: 'Non-goals' },
]

export function DescribeStep({ brief, drafting, onSubmit }: { brief: PlannerBrief; drafting: boolean; onSubmit: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading m-0 text-base font-medium leading-snug">Describe the project</h2>
        </CardTitle>
        <CardDescription>Prefilled for the demo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          {FIELDS.map((f) => (
            <Fragment key={f.key}>
              <dt className="text-sm font-medium">{f.label}</dt>
              <dd className="text-sm text-muted-foreground">{brief[f.key]}</dd>
            </Fragment>
          ))}
        </dl>
        <Button onClick={onSubmit} disabled={drafting}>
          {drafting ? 'Planner is drafting…' : 'Submit to planner'}
        </Button>
      </CardContent>
    </Card>
  )
}
