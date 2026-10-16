import { acsOf, currentScope } from '@/lib/domain/scope'
import type { AcState, HumanTestResult, IsoDateTime, Project, PullRequest, Task } from '@/lib/domain/types'
import { evidenceCutoffs, isBeforeCutoff } from './evidenceCutoff'

export interface AcTransition {
  state: AcState
  at: IsoDateTime
}

export interface AcStatus {
  acId: string
  humanTest: boolean
  state: AcState
  /** Every state change, oldest first. Empty means not_started. */
  history: AcTransition[]
}

export interface EvidenceInput {
  project: Project
  tasks: Task[]
  prs: PullRequest[]
  humanTests: HumanTestResult[]
}

type AcEvent =
  | { kind: 'opened'; at: IsoDateTime; order: 0; prNumber: number }
  | { kind: 'merged'; at: IsoDateTime; order: 1; prNumber: number; pr: PullRequest }
  | { kind: 'tested'; at: IsoDateTime; order: 2; result: HumanTestResult }

/** Only 'opened'/'merged' events carry a PR number; 'tested' events tie-break before any of those. */
const prNumberOf = (event: AcEvent): number => (event.kind === 'tested' ? 0 : event.prNumber)

const NOT_YET_DELIVERED: readonly AcState[] = ['not_started', 'in_progress']

/** Applies README §3.3 to raw evidence, skipping evidence from before an AC's last text change. See the spec §4.1. */
export function deriveAcStates({ project, tasks, prs, humanTests }: EvidenceInput): AcStatus[] {
  const acIdsByTask = new Map(tasks.map((t) => [t.id, new Set(t.acIds)]))
  const touches = (pr: PullRequest, acId: string) =>
    pr.taskIds.some((id) => acIdsByTask.get(id)?.has(acId)) || pr.testPlan.some((item) => item.acId === acId)

  const cutoffs = evidenceCutoffs(project)

  return acsOf(currentScope(project)).map((ac) => {
    // A changed AC needs new proof: PRs merged and human results recorded before the change don't count.
    const cutoff = cutoffs.get(ac.id)
    const events: AcEvent[] = []
    for (const pr of prs) {
      if (pr.state === 'closed' || !touches(pr, ac.id)) continue
      if (pr.state === 'merged' && pr.mergedAt && isBeforeCutoff(cutoff, pr.mergedAt)) continue
      events.push({ kind: 'opened', at: pr.openedAt, order: 0, prNumber: pr.number })
      if (pr.state === 'merged' && pr.mergedAt) events.push({ kind: 'merged', at: pr.mergedAt, order: 1, prNumber: pr.number, pr })
    }
    if (ac.humanTest) {
      for (const result of humanTests) {
        if (result.acId === ac.id && !isBeforeCutoff(cutoff, result.testedAt)) events.push({ kind: 'tested', at: result.testedAt, order: 2, result })
      }
    }
    events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.order - b.order || prNumberOf(a) - prNumberOf(b))

    let state: AcState = 'not_started'
    const history: AcTransition[] = []
    for (const event of events) {
      const next: AcState = ac.humanTest ? nextHumanState(state, event) : nextRegularState(state, event, ac.id)
      if (next !== state) {
        state = next
        history.push({ state, at: event.at })
      }
    }
    return { acId: ac.id, humanTest: ac.humanTest, state, history }
  })
}

function nextRegularState(state: AcState, event: AcEvent, acId: string): AcState {
  if (event.kind === 'opened') return state === 'not_started' ? 'in_progress' : state
  if (event.kind !== 'merged') return state

  const item = event.pr.testPlan.find((i) => i.acId === acId)
  const ticked = item?.mark === 'ticked'
  if (item?.mark === 'failed' || (ticked && event.pr.ci === 'failing')) {
    return state === 'verified' || state === 'regressed' ? 'regressed' : 'failing'
  }
  if (ticked && (event.pr.ci === 'passing' || event.pr.ci === 'none')) return 'verified'
  // Unticked, missing from the test plan, or CI still pending: merged but not proven.
  return NOT_YET_DELIVERED.includes(state) ? 'implemented' : state
}

function nextHumanState(state: AcState, event: AcEvent): AcState {
  if (event.kind === 'opened') return state === 'not_started' ? 'in_progress' : state
  if (event.kind === 'merged') return NOT_YET_DELIVERED.includes(state) ? 'pending_user_testing' : state
  // Not yet delivered: a human result recorded before the touching PR merged doesn't count.
  if (NOT_YET_DELIVERED.includes(state)) return state
  return event.result.result === 'pass' ? 'verified' : 'failing'
}
