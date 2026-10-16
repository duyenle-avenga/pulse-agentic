import { describe, expect, it } from 'vitest'
import { acsOf, currentScope } from '@/lib/domain/scope'
import { DEMO_NOW } from './clock'
import { ALL_PROJECTS } from './index'

const unique = (ids: (string | number)[]) => new Set(ids).size === ids.length

describe.each(ALL_PROJECTS.map((d) => [d.project.id, d] as const))('mock integrity: %s', (projectId, data) => {
  const { project, tasks, prs, humanTests, scrs, warnings } = data
  const allAcs = project.scopeVersions.flatMap(acsOf)
  // Arrays, not Sets: Vitest's toContain works on arrays and strings.
  const acIds = allAcs.map((a) => a.id)
  const humanAcIds = allAcs.filter((a) => a.humanTest).map((a) => a.id)
  const storyIds = project.scopeVersions.flatMap((v) => v.features.flatMap((f) => f.stories.map((s) => s.id)))
  const taskIds = tasks.map((t) => t.id)
  const prNumbers = prs.map((p) => p.number)
  const acStoryIds = new Map<string, string>()
  for (const v of project.scopeVersions) for (const f of v.features) for (const s of f.stories) for (const a of s.acs) acStoryIds.set(a.id, s.id)

  it('has unique ids', () => {
    expect(unique(acsOf(currentScope(project)).map((a) => a.id))).toBe(true)
    expect(unique(tasks.map((t) => t.id))).toBe(true)
    expect(unique(prs.map((p) => p.number))).toBe(true)
    expect(unique(scrs.map((s) => s.id))).toBe(true)
    expect(unique(warnings.map((s) => s.id))).toBe(true)
  })

  it('links every task to known stories, ACs and dependencies', () => {
    for (const t of tasks) {
      expect(storyIds, `${t.id} story`).toContain(t.storyId)
      for (const id of t.acIds) expect(acIds, `${t.id} → ${id}`).toContain(id)
      for (const id of t.dependsOn) expect(taskIds, `${t.id} depends on ${id}`).toContain(id)
    }
  })

  it('ties every task to its story through at least one of its ACs', () => {
    for (const t of tasks) {
      const tied = t.acIds.some((id) => acStoryIds.get(id) === t.storyId)
      expect(tied, `${t.id} storyId ${t.storyId}`).toBe(true)
    }
  })

  it('links every PR to known tasks and ACs, with consistent merge data', () => {
    for (const p of prs) {
      for (const id of p.taskIds) expect(taskIds, `PR #${p.number} → ${id}`).toContain(id)
      for (const item of p.testPlan) if (item.acId) expect(acIds, `PR #${p.number} → ${item.acId}`).toContain(item.acId)
      expect(p.state === 'merged', `PR #${p.number} mergedAt`).toBe(p.mergedAt !== undefined)
    }
  })

  it('records human tests only for 👤 ACs', () => {
    for (const t of humanTests) expect(humanAcIds).toContain(t.acId)
  })

  it('links SCRs and warnings to known PRs, tasks and ACs', () => {
    for (const s of scrs) if (s.prNumber !== undefined) expect(prNumbers).toContain(s.prNumber)
    for (const s of warnings) {
      if (s.links.prNumber !== undefined) expect(prNumbers, s.id).toContain(s.links.prNumber)
      if (s.links.taskId) expect(taskIds, s.id).toContain(s.links.taskId)
      if (s.links.acId) expect(acIds, s.id).toContain(s.links.acId)
    }
  })

  it('uses its own project id everywhere', () => {
    for (const x of [...tasks, ...prs, ...scrs, ...warnings]) expect(x.projectId).toBe(projectId)
  })

  it('dates nothing after the demo clock', () => {
    const dates = [
      ...project.scopeVersions.map((v) => v.lockedAt),
      ...prs.flatMap((p) => [p.openedAt, p.mergedAt ?? p.openedAt]),
      ...humanTests.map((t) => t.testedAt),
      ...scrs.flatMap((s) => [s.raisedAt, s.decidedAt ?? s.raisedAt]),
      ...warnings.map((s) => s.raisedAt),
    ]
    for (const d of dates) expect(Date.parse(d), d).toBeLessThanOrEqual(Date.parse(DEMO_NOW))
  })

  it('numbers PRs in the order they were opened', () => {
    const sorted = [...prs].sort((a, b) => a.number - b.number)
    for (let i = 1; i < sorted.length; i++) {
      expect(Date.parse(sorted[i].openedAt), `PR #${sorted[i].number} openedAt`).toBeGreaterThanOrEqual(
        Date.parse(sorted[i - 1].openedAt),
      )
    }
  })

  it('ties SCR proposals to known features, stories and ACs', () => {
    const featureIds = project.scopeVersions.flatMap((v) => v.features.map((f) => f.id))
    for (const s of scrs) {
      if (!s.proposal) continue
      for (const a of s.proposal.addStories) if (!a.featureTitle) expect(featureIds, `${s.id} → ${a.featureId}`).toContain(a.featureId)
      for (const a of s.proposal.addAcs) expect(storyIds, `${s.id} → ${a.storyId}`).toContain(a.storyId)
      for (const c of s.proposal.changeAcs) expect(acIds, `${s.id} → ${c.acId}`).toContain(c.acId)
      for (const id of s.proposal.removeAcIds) expect(acIds, `${s.id} → ${id}`).toContain(id)
    }
  })

  it('gives pending SCRs new AC and task ids', () => {
    for (const s of scrs) {
      if (s.status !== 'pending' || !s.proposal) continue
      const newAcIds = [...s.proposal.addStories.flatMap((a) => a.story.acs.map((x) => x.id)), ...s.proposal.addAcs.map((a) => a.ac.id)]
      for (const id of newAcIds) expect(acIds, `${s.id} → ${id}`).not.toContain(id)
      for (const t of s.proposal.tasks) expect(taskIds, `${s.id} → ${t.id}`).not.toContain(t.id)
    }
  })

  it('records who decided every decided SCR, and when', () => {
    for (const s of scrs) {
      if (s.status === 'pending') continue
      expect(s.decidedAt, s.id).toBeDefined()
      expect(s.decidedBy, s.id).toBeDefined()
    }
  })

  it('leaves pending decisions and pending user testing to be computed', () => {
    expect(warnings.filter((w) => w.type === 'pending_decision' || w.type === 'pending_user_testing')).toEqual([])
  })
})
