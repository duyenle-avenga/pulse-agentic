import type {
  AcceptanceCriterion,
  Feature,
  IsoDateTime,
  PrSections,
  PullRequest,
  Task,
  TestPlanItem,
  TestType,
  UserStory,
} from '@/lib/domain/types'

const pad = (n: number) => String(n).padStart(2, '0')

/** A 2026 timestamp in Europe/Berlin summer time (all demo dates are before 25 Oct). */
export const at = (month: number, day: number, hour = 9, minute = 0): IsoDateTime =>
  `2026-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+02:00`

export const ac = (id: string, text: string, humanTest = false): AcceptanceCriterion => ({ id, text, humanTest })
export const story = (id: string, text: string, acs: AcceptanceCriterion[]): UserStory => ({ id, text, acs })
export const feature = (id: string, title: string, stories: UserStory[]): Feature => ({ id, title, stories })

type TaskInput = Omit<Task, 'projectId' | 'intent' | 'dependsOn'> & Partial<Pick<Task, 'intent' | 'dependsOn'>>

export const task = (projectId: string, input: TaskInput): Task => ({ intent: '', dependsOn: [], ...input, projectId })

export const ticked = (acId: string, testType: TestType, testFile?: string): TestPlanItem => ({
  acId, text: acId, mark: 'ticked', testType, testFile,
})
export const unticked = (acId: string): TestPlanItem => ({ acId, text: acId, mark: 'unticked' })
export const failedItem = (acId: string, testType: TestType, testFile?: string): TestPlanItem => ({
  acId, text: acId, mark: 'failed', testType, testFile,
})

type PrInput = Pick<PullRequest, 'number' | 'title' | 'state' | 'openedAt' | 'ci'> &
  Partial<Omit<PullRequest, 'projectId' | 'sections'>> & { sections?: Partial<PrSections> }

/** Deterministic fake commit SHA so mocks stay stable. */
const fakeSha = (n: number) => ((n * 2654435761) >>> 0).toString(16).padStart(8, '0').slice(0, 7)

export function pr(projectId: string, input: PrInput): PullRequest {
  const testPlan = input.testPlan ?? []
  const scopeChangeNotes = input.scopeChangeNotes ?? []
  return {
    taskIds: [],
    headSha: fakeSha(input.number),
    ...input,
    testPlan,
    scopeChangeNotes,
    sections: {
      summary: true,
      migration: false,
      testPlan: testPlan.length > 0,
      notes: scopeChangeNotes.length > 0,
      ...input.sections,
    },
    projectId,
  }
}
