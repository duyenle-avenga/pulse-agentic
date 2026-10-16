import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_DECISIONS } from '@/lib/domain/planner'
import { DECISIONS_KEY, createLocalStorageDecisionStore } from './local-storage-store'

const P = 'intelligent-flow-v2'
const AT = '2026-10-16T09:00:00+02:00'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v },
    data,
  }
}

describe('LocalStorageDecisionStore', () => {
  let storage: ReturnType<typeof fakeStorage>
  beforeEach(() => { storage = fakeStorage() })
  const make = () => createLocalStorageDecisionStore(() => storage as unknown as Storage)

  it('returns empty decisions for an unknown project', () => {
    expect(make().get(P)).toEqual(EMPTY_DECISIONS)
  })

  it('records story decisions and persists them under one versioned key', () => {
    const store = make()
    store.decideStory(P, 'US-1.1', 'approved')
    store.decideStory(P, 'US-4.1', 'rejected')
    expect(store.get(P).stories).toEqual({ 'US-1.1': 'approved', 'US-4.1': 'rejected' })
    expect(JSON.parse(storage.data[DECISIONS_KEY])[P].stories).toEqual({ 'US-1.1': 'approved', 'US-4.1': 'rejected' })
    expect(make().get(P).stories['US-4.1']).toBe('rejected') // a new store reads it back
  })

  it('decideAll only touches undecided stories', () => {
    const store = make()
    store.decideStory(P, 'US-2.1', 'rejected')
    store.decideAll(P, ['US-1.1', 'US-2.1', 'US-3.1'], 'approved')
    expect(store.get(P).stories).toEqual({ 'US-1.1': 'approved', 'US-2.1': 'rejected', 'US-3.1': 'approved' })
  })

  it('freezes decisions once locked, until reset', () => {
    const store = make()
    store.decideStory(P, 'US-1.1', 'approved')
    store.lock(P, AT, 'Demo approver')
    store.decideStory(P, 'US-1.1', 'rejected')
    store.decideAll(P, ['US-2.1'], 'approved')
    expect(store.get(P)).toEqual({ stories: { 'US-1.1': 'approved' }, lock: { lockedAt: AT, lockedBy: 'Demo approver' } })
    expect(make().get(P).lock).toEqual({ lockedAt: AT, lockedBy: 'Demo approver' }) // the lock survives a reload
    store.reset(P)
    expect(store.get(P)).toEqual(EMPTY_DECISIONS)
    expect(make().get(P)).toEqual(EMPTY_DECISIONS)
  })

  it('returns the same object until something changes (stable snapshot)', () => {
    const store = make()
    store.decideStory(P, 'US-1.1', 'approved')
    expect(store.get(P)).toBe(store.get(P))
  })

  it('notifies subscribers on change, not on no-ops', () => {
    const store = make()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.decideStory(P, 'US-1.1', 'approved')
    store.decideStory(P, 'US-1.1', 'approved')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    store.decideStory(P, 'US-2.1', 'approved')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('treats corrupt JSON as empty and keeps working', () => {
    storage = fakeStorage({ [DECISIONS_KEY]: '{not json' })
    const store = make()
    expect(store.get(P)).toEqual(EMPTY_DECISIONS)
    store.decideStory(P, 'US-1.1', 'approved')
    expect(store.get(P).stories).toEqual({ 'US-1.1': 'approved' })
  })

  it('drops stored values of the wrong shape', () => {
    storage = fakeStorage({
      [DECISIONS_KEY]: JSON.stringify({
        [P]: { stories: { 'US-1.1': 'approved', 'US-2.1': 'maybe', 'US-3.1': 7 }, lock: { lockedAt: 5 } },
        other: { stories: 'abc', lock: 'yes' },
        list: { stories: ['approved'], lock: null },
      }),
    })
    const store = make()
    expect(store.get(P)).toEqual({ stories: { 'US-1.1': 'approved' }, lock: null })
    expect(store.get('other')).toEqual(EMPTY_DECISIONS)
    expect(store.get('list')).toEqual(EMPTY_DECISIONS)
  })

  it('ignores a top-level array and project entries that are not objects', () => {
    storage = fakeStorage({ [DECISIONS_KEY]: JSON.stringify([{ stories: { 'US-1.1': 'approved' }, lock: null }]) })
    expect(make().get('0')).toEqual(EMPTY_DECISIONS)
    storage = fakeStorage({ [DECISIONS_KEY]: JSON.stringify({ [P]: 'x' }) })
    expect(make().get(P)).toEqual(EMPTY_DECISIONS)
  })

  it('keeps working in memory when storage throws', () => {
    const throwing = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    const store = createLocalStorageDecisionStore(() => throwing as unknown as Storage)
    store.decideStory(P, 'US-1.1', 'approved')
    expect(store.get(P).stories).toEqual({ 'US-1.1': 'approved' })
  })

  it('works without any storage (server)', () => {
    const store = createLocalStorageDecisionStore(() => undefined)
    expect(store.get(P)).toEqual(EMPTY_DECISIONS)
  })

  const result = { acId: 'AC-1', result: 'pass' as const, environment: 'staging', tester: 'Ana Silva', testedAt: AT }
  const approve = { status: 'approved' as const, decidedAt: AT, decidedBy: 'Maya Patel', reason: 'Accountants need it' }

  it('records human test results in order and persists them', () => {
    const store = make()
    const failed = { ...result, acId: 'AC-2', result: 'fail' as const, notes: 'Button hidden on small screens' }
    store.recordHumanTest(P, result)
    store.recordHumanTest(P, failed)
    expect(store.get(P).humanTests).toEqual([result, failed])
    expect(make().get(P).humanTests).toEqual([result, failed])
  })

  it('decides an SCR only once', () => {
    const store = make()
    store.decideScr(P, 'SCR-1', approve)
    store.decideScr(P, 'SCR-1', { ...approve, status: 'rejected' })
    expect(store.get(P).scrs).toEqual({ 'SCR-1': approve })
    expect(make().get(P).scrs).toEqual({ 'SCR-1': approve })
  })

  it('loads decisions saved before human tests and SCRs existed', () => {
    storage = fakeStorage({ [DECISIONS_KEY]: JSON.stringify({ [P]: { stories: { 'US-1.1': 'approved' }, lock: null } }) })
    expect(make().get(P)).toEqual({ stories: { 'US-1.1': 'approved' }, lock: null })
  })

  it('drops malformed human tests and SCR decisions', () => {
    storage = fakeStorage({
      [DECISIONS_KEY]: JSON.stringify({
        [P]: {
          stories: {},
          lock: null,
          humanTests: [{ ...result, result: 'maybe' }, { ...result, acId: 'AC-2' }, 'nope'],
          scrs: { 'SCR-1': { status: 'approved', decidedAt: AT, decidedBy: 'Maya Patel' }, 'SCR-2': { ...approve, status: 'rejected' } },
        },
      }),
    })
    const d = make().get(P)
    expect(d.humanTests?.map((t) => t.acId)).toEqual(['AC-2'])
    expect(Object.keys(d.scrs ?? {})).toEqual(['SCR-2'])
  })

  it('reset clears human tests and SCR decisions too', () => {
    const store = make()
    store.recordHumanTest(P, result)
    store.decideScr(P, 'SCR-1', approve)
    store.reset(P)
    expect(store.get(P)).toEqual(EMPTY_DECISIONS)
  })

  it('getAll returns every project and stays the same object until something changes', () => {
    const store = make()
    store.decideScr('expense-tracker', 'SCR-1', approve)
    store.recordHumanTest('intelligent-flow', result)
    const all = store.getAll()
    expect(Object.keys(all).sort()).toEqual(['expense-tracker', 'intelligent-flow'])
    expect(store.getAll()).toBe(all)
    store.recordHumanTest('intelligent-flow', { ...result, acId: 'AC-2' })
    expect(store.getAll()).not.toBe(all)
  })
})
