import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProjectDecisions, StoryDecision } from '@/lib/domain/planner'
import type { Feature, UserStory } from '@/lib/domain/types'

interface ReviewStepProps {
  features: Feature[]
  decisions: ProjectDecisions
  onDecide: (storyId: string, decision: StoryDecision) => void
  onApproveAll: () => void
  onLock: () => void
}

export function ReviewStep({ features, decisions, onDecide, onApproveAll, onLock }: ReviewStepProps) {
  const stories = features.flatMap((f) => f.stories)
  const decided = stories.filter((s) => decisions.stories[s.id]).length
  const approved = stories.filter((s) => decisions.stories[s.id] === 'approved').length
  const lockHint = decided < stories.length ? 'Decide every story to lock v1.' : approved === 0 ? 'Approve at least one story to lock v1.' : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Review the generated scope</h2>
          <p className="text-sm text-muted-foreground">{`${decided} of ${stories.length} stories decided`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onApproveAll} disabled={decided === stories.length}>
            Approve all
          </Button>
          <Button onClick={onLock} disabled={lockHint !== null}>
            Lock v1
          </Button>
        </div>
      </div>
      {lockHint && <p className="text-sm text-muted-foreground">{lockHint}</p>}
      {features.map((f) => (
        <section key={f.id} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{`${f.id} · ${f.title}`}</h3>
          {f.stories.map((s) => (
            <StoryCard key={s.id} story={s} decision={decisions.stories[s.id]} onDecide={(d) => onDecide(s.id, d)} />
          ))}
        </section>
      ))}
    </div>
  )
}

function StoryCard({ story, decision, onDecide }: { story: UserStory; decision?: StoryDecision; onDecide: (d: StoryDecision) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h4 className="font-heading m-0 text-base font-medium leading-snug">{`${story.id} ${story.text}`}</h4>
        </CardTitle>
        {decision && <Badge variant={decision === 'approved' ? 'secondary' : 'destructive'}>{decision === 'approved' ? 'Approved' : 'Rejected'}</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1 text-sm">
          {story.acs.map((a) => (
            <li key={a.id}>
              <span className="font-mono text-xs text-muted-foreground">{a.id}</span> {a.text}
              {a.humanTest && <span title="Needs a human tester"> 👤</span>}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button size="sm" variant={decision === 'approved' ? 'default' : 'outline'} aria-pressed={decision === 'approved'} aria-label={`Approve ${story.id}`} onClick={() => onDecide('approved')}>
            Approve
          </Button>
          <Button size="sm" variant={decision === 'rejected' ? 'destructive' : 'outline'} aria-pressed={decision === 'rejected'} aria-label={`Reject ${story.id}`} onClick={() => onDecide('rejected')}>
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
