import { describe, expect, it } from 'vitest'
import { lockHint } from './lock-rule'

const ids = ['US-1', 'US-2']

describe('lockHint', () => {
  it('asks for every story to be decided first', () => {
    expect(lockHint(ids, { stories: { 'US-1': 'approved' }, lock: null })).toBe('Decide every story to lock v1.')
  })

  it('asks for at least one approval', () => {
    expect(lockHint(ids, { stories: { 'US-1': 'rejected', 'US-2': 'rejected' }, lock: null })).toBe('Approve at least one story to lock v1.')
  })

  it('allows locking once every story is decided and one is approved', () => {
    expect(lockHint(ids, { stories: { 'US-1': 'approved', 'US-2': 'rejected' }, lock: null })).toBeNull()
  })
})
