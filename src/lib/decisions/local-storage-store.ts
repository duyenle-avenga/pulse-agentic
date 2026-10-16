import { EMPTY_DECISIONS, type ProjectDecisions, type ScrDecision, type StoryDecision } from '@/lib/domain/planner'
import type { HumanTestResult } from '@/lib/domain/types'
import type { DecisionStore } from './store'

export const DECISIONS_KEY = 'pulse-agentic:decisions:v1'

type AllDecisions = Record<string, ProjectDecisions>

const browserStorage = () => (typeof window === 'undefined' ? undefined : window.localStorage)

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const isDecision = (v: unknown): v is StoryDecision => v === 'approved' || v === 'rejected'

function normalizeLock(value: unknown): ProjectDecisions['lock'] {
  if (!isRecord(value) || typeof value.lockedAt !== 'string' || typeof value.lockedBy !== 'string') return null
  return { lockedAt: value.lockedAt, lockedBy: value.lockedBy }
}

const isString = (v: unknown): v is string => typeof v === 'string'

function normalizeHumanTest(value: unknown): HumanTestResult | null {
  if (!isRecord(value)) return null
  const { acId, result, environment, tester, testedAt, notes } = value
  if (!isString(acId) || (result !== 'pass' && result !== 'fail') || !isString(environment) || !isString(tester) || !isString(testedAt)) {
    return null
  }
  return { acId, result, environment, tester, testedAt, ...(isString(notes) ? { notes } : {}) }
}

function normalizeScrDecision(value: unknown): ScrDecision | null {
  if (!isRecord(value)) return null
  const { status, decidedAt, decidedBy, reason } = value
  if ((status !== 'approved' && status !== 'rejected') || !isString(decidedAt) || !isString(decidedBy) || !isString(reason)) return null
  return { status, decidedAt, decidedBy, reason }
}

/** Keeps only well-formed entries; anything else in storage is ignored. */
function normalize(value: unknown): AllDecisions {
  if (!isRecord(value)) return {}
  const out: AllDecisions = {}
  for (const [id, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue
    const stories: Record<string, StoryDecision> = {}
    if (isRecord(entry.stories)) {
      for (const [storyId, decision] of Object.entries(entry.stories)) {
        if (isDecision(decision)) stories[storyId] = decision
      }
    }
    const humanTests = Array.isArray(entry.humanTests)
      ? entry.humanTests.map(normalizeHumanTest).filter((t): t is HumanTestResult => t !== null)
      : []
    const scrs: Record<string, ScrDecision> = {}
    if (isRecord(entry.scrs)) {
      for (const [scrId, decision] of Object.entries(entry.scrs)) {
        const normalized = normalizeScrDecision(decision)
        if (normalized) scrs[scrId] = normalized
      }
    }
    out[id] = {
      stories,
      lock: normalizeLock(entry.lock),
      // Only present when used, so wizard-only decisions keep their original shape.
      ...(humanTests.length > 0 ? { humanTests } : {}),
      ...(Object.keys(scrs).length > 0 ? { scrs } : {}),
    }
  }
  return out
}

/** Every read and write is guarded: blocked storage or corrupt JSON just means "no saved decisions". */
export function createLocalStorageDecisionStore(storage: () => Storage | undefined = browserStorage): DecisionStore {
  let all: AllDecisions | null = null
  const listeners = new Set<() => void>()

  function load(): AllDecisions {
    if (all) return all
    try {
      const raw = storage()?.getItem(DECISIONS_KEY)
      all = raw ? normalize(JSON.parse(raw)) : {}
    } catch {
      all = {}
    }
    return all
  }

  function save(next: AllDecisions) {
    all = next
    try {
      storage()?.setItem(DECISIONS_KEY, JSON.stringify(next))
    } catch {
      // Keep the in-memory copy for this session.
    }
    for (const listener of listeners) listener()
  }

  function update(projectId: string, change: (current: ProjectDecisions) => ProjectDecisions) {
    const current = load()[projectId] ?? EMPTY_DECISIONS
    const next = change(current)
    if (next !== current) save({ ...load(), [projectId]: next })
  }

  return {
    get: (projectId) => load()[projectId] ?? EMPTY_DECISIONS,

    getAll: () => load(),

    decideStory: (projectId, storyId, decision) =>
      update(projectId, (d) => (d.lock || d.stories[storyId] === decision ? d : { ...d, stories: { ...d.stories, [storyId]: decision } })),

    decideAll: (projectId, storyIds, decision) =>
      update(projectId, (d) => {
        const undecided = storyIds.filter((id) => !d.stories[id])
        if (d.lock || undecided.length === 0) return d
        return { ...d, stories: { ...d.stories, ...Object.fromEntries(undecided.map((id) => [id, decision])) } }
      }),

    lock: (projectId, lockedAt, lockedBy) => update(projectId, (d) => (d.lock ? d : { ...d, lock: { lockedAt, lockedBy } })),

    recordHumanTest: (projectId, result) =>
      update(projectId, (d) => ({ ...d, humanTests: [...(d.humanTests ?? []), result] })),

    decideScr: (projectId, scrId, decision) =>
      update(projectId, (d) => (d.scrs?.[scrId] ? d : { ...d, scrs: { ...d.scrs, [scrId]: decision } })),

    reset: (projectId) => {
      const current = load()
      if (!(projectId in current)) return
      const next = { ...current }
      delete next[projectId]
      save(next)
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
