import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlannerQuestion } from '@/lib/domain/planner'

export function QuestionsStep({ questions, drafting, onSubmit }: { questions: PlannerQuestion[]; drafting: boolean; onSubmit: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading m-0 text-base font-medium leading-snug">The planner has a few questions</h2>
        </CardTitle>
        <CardDescription>Answers are prefilled for the demo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q) => (
          <fieldset key={q.id} className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{q.question}</legend>
            {q.options.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input type="radio" name={q.id} value={option} checked={option === q.answer} readOnly disabled />
                {option}
              </label>
            ))}
          </fieldset>
        ))}
        <Button onClick={onSubmit} disabled={drafting}>
          {drafting ? 'Planner is drafting…' : 'Submit answers'}
        </Button>
      </CardContent>
    </Card>
  )
}
