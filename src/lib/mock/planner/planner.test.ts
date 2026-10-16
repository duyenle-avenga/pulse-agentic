import { describe, expect, it } from 'vitest'
import { WIZARD_PROJECT_ID } from '@/lib/domain/planner'
import { acsOf, currentScope } from '@/lib/domain/scope'
import { intelligentFlow } from '../project-c'
import { ALL_DRAFTS, intelligentFlowV2 } from './index'

const draft = intelligentFlowV2
const stories = draft.scope.features.flatMap((f) => f.stories)
const acs = draft.scope.features.flatMap((f) => f.stories.flatMap((s) => s.acs))
const unique = (ids: string[]) => new Set(ids).size === ids.length

describe('planner draft: Intelligent Flow v2', () => {
  it('is the only draft and uses its own project id', () => {
    expect(ALL_DRAFTS).toEqual([draft])
    expect(draft.brief.projectId).toBe(WIZARD_PROJECT_ID)
    expect(draft.brief.name).toBe('Intelligent Flow v2')
  })

  it('has 7 features, 7 stories, 28 ACs (3 👤) and 17 tasks', () => {
    expect(draft.scope.features).toHaveLength(7)
    expect(stories).toHaveLength(7)
    expect(acs).toHaveLength(28)
    expect(acs.filter((a) => a.humanTest).map((a) => a.id)).toEqual(['AC-3.1.5', 'AC-5.1.5', 'AC-6.1.4'])
    expect(draft.tasks).toHaveLength(17)
  })

  it('copies the scope from the scope doc (same as project C)', () => {
    expect(draft.scope.features).toEqual(currentScope(intelligentFlow.project).features)
    expect(acsOf(currentScope(intelligentFlow.project))).toHaveLength(28)
  })

  it('keeps task ACs and dependencies in line with project C', () => {
    for (const t of draft.tasks) {
      const c = intelligentFlow.tasks.find((x) => x.id === t.id)
      expect(c, t.id).toBeDefined()
      expect({ storyId: t.storyId, acIds: t.acIds, dependsOn: t.dependsOn }, t.id).toEqual({ storyId: c?.storyId, acIds: c?.acIds, dependsOn: c?.dependsOn })
      expect(t.intent, t.id).not.toBe('')
    }
  })

  it('has unique ids and only valid references', () => {
    expect(unique(stories.map((s) => s.id))).toBe(true)
    expect(unique(acs.map((a) => a.id))).toBe(true)
    expect(unique(draft.tasks.map((t) => t.id))).toBe(true)
    const acIds = acs.map((a) => a.id)
    const taskIds = draft.tasks.map((t) => t.id)
    const storyIds = stories.map((s) => s.id)
    for (const t of draft.tasks) {
      expect(storyIds, `${t.id} → ${t.storyId}`).toContain(t.storyId)
      for (const id of t.acIds) expect(acIds, `${t.id} → ${id}`).toContain(id)
      for (const id of t.dependsOn) expect(taskIds, `${t.id} depends on ${id}`).toContain(id)
    }
  })

  it('prefills every question with one of its options', () => {
    expect(draft.questions).toHaveLength(4)
    for (const q of draft.questions) expect(q.options).toContain(q.answer)
  })

  it('stays clear of the review notes and never says console', () => {
    const text = JSON.stringify(draft)
    for (const term of ['console', 'React', 'MUI', 'Radix', 'prototype', 'bulk', 'unassigned', 'ADR', 'mvp-stack', 'apps/']) {
      expect(text, term).not.toMatch(new RegExp(term, 'i'))
    }
  })
})
