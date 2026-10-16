import type { ProjectDecisions } from '@/lib/domain/planner'
import type { IsoDateTime, ProjectData, ScopeChangeRequest, ScopeProposal, ScopeVersion, Task } from '@/lib/domain/types'
import { deriveAcStates } from './deriveAcStates'
import { deriveWarnings } from './deriveWarnings'
import { applyProposal, nextVersionLabel } from './scopeChange'

type Approved = ScopeChangeRequest & { decidedAt: IsoDateTime; decidedBy: string; proposal: ScopeProposal }

/** Mock data plus the human decisions stored in this browser (README §3.2–3.4). Pure. */
export function applyProjectDecisions(data: ProjectData, decisions: ProjectDecisions, now: IsoDateTime): ProjectData {
  const stored = decisions.scrs ?? {}
  const approvedNow: Approved[] = []

  const scrs = data.scrs.map((scr) => {
    const decision = stored[scr.id]
    // The mocks' own decisions are final; only pending SCRs take a stored decision.
    if (scr.status !== 'pending' || !decision) return scr
    const decided = { ...scr, status: decision.status, decidedAt: decision.decidedAt, decidedBy: decision.decidedBy, decisionReason: decision.reason }
    if (decided.status === 'approved' && decided.proposal) approvedNow.push({ ...decided, proposal: decided.proposal })
    return decided
  })
  approvedNow.sort((a, b) => Date.parse(a.decidedAt) - Date.parse(b.decidedAt) || a.id.localeCompare(b.id))

  const scopeVersions: ScopeVersion[] = [...data.project.scopeVersions]
  const tasks: Task[] = [...data.tasks]
  for (const scr of approvedNow) {
    const current = scopeVersions[scopeVersions.length - 1]
    scopeVersions.push({
      label: nextVersionLabel(current.label),
      lockedAt: scr.decidedAt,
      approvedBy: scr.decidedBy,
      changedBy: scr.id,
      features: applyProposal(current.features, scr.proposal),
    })
    tasks.push(...scr.proposal.tasks.map((t) => ({ ...t, projectId: data.project.id })))
  }

  const merged: ProjectData = {
    ...data,
    project: { ...data.project, scopeVersions },
    tasks,
    humanTests: [...data.humanTests, ...(decisions.humanTests ?? [])],
    scrs,
  }
  return { ...merged, warnings: deriveWarnings(merged, deriveAcStates(merged), now) }
}
