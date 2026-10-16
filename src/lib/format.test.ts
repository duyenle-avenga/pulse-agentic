import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatDuration, formatRelative } from './format'

const NOW = '2026-10-16T09:00:00+02:00'

describe('formatDuration', () => {
  it('uses minutes under an hour, hours under two days, then days', () => {
    expect(formatDuration('2026-10-16T08:35:00+02:00', NOW)).toBe('25 min')
    expect(formatDuration('2026-10-16T06:00:00+02:00', NOW)).toBe('3 h')
    expect(formatDuration('2026-10-14T10:00:00+02:00', NOW)).toBe('47 h')
    expect(formatDuration('2026-10-13T09:00:00+02:00', NOW)).toBe('3 d')
  })

  it('never goes negative', () => {
    expect(formatDuration('2026-10-16T10:00:00+02:00', NOW)).toBe('0 min')
  })
})

describe('formatRelative', () => {
  it('adds "ago", or says "just now"', () => {
    expect(formatRelative('2026-10-16T06:00:00+02:00', NOW)).toBe('3 h ago')
    expect(formatRelative(NOW, NOW)).toBe('just now')
  })
})

describe('formatDate / formatDateTime', () => {
  it('formats in Europe/Berlin with short English month names', () => {
    expect(formatDate('2026-09-22T11:00:00+02:00')).toBe('22 Sep')
    expect(formatDate('2026-10-02T23:30:00Z')).toBe('3 Oct')
    expect(formatDateTime(NOW)).toBe('16 Oct 2026, 09:00')
  })
})
