import type { Feature } from '@/lib/domain/types'

export type DiffKind = 'added' | 'changed' | 'removed'
export type DiffLevel = 'feature' | 'story' | 'ac'

export interface ScopeDiffEntry {
  kind: DiffKind
  level: DiffLevel
  id: string
  /** Feature title, story text, or AC text (with 👤 for human-test ACs). For removed items, the old text. */
  text: string
  /** Only for changed items. */
  before?: string
}

type Scope = { features: Feature[] }

const LEVELS: readonly DiffLevel[] = ['feature', 'story', 'ac']

function index({ features }: Scope): Record<DiffLevel, Map<string, string>> {
  const out: Record<DiffLevel, Map<string, string>> = { feature: new Map(), story: new Map(), ac: new Map() }
  for (const f of features) {
    out.feature.set(f.id, f.title)
    for (const s of f.stories) {
      out.story.set(s.id, s.text)
      for (const a of s.acs) out.ac.set(a.id, a.humanTest ? `${a.text} 👤` : a.text)
    }
  }
  return out
}

/** What changed from one scope to another, by id. Order: features, stories, ACs; added and changed in `to` order, then removed. */
export function diffScopes(from: Scope, to: Scope): ScopeDiffEntry[] {
  const a = index(from)
  const b = index(to)
  return LEVELS.flatMap((level) => {
    const entries: ScopeDiffEntry[] = []
    for (const [id, text] of b[level]) {
      const before = a[level].get(id)
      if (before === undefined) entries.push({ kind: 'added', level, id, text })
      else if (before !== text) entries.push({ kind: 'changed', level, id, text, before })
    }
    for (const [id, text] of a[level]) if (!b[level].has(id)) entries.push({ kind: 'removed', level, id, text })
    return entries
  })
}

const NOUN: Record<DiffLevel, [singular: string, plural: string]> = {
  feature: ['feature', 'features'],
  story: ['story', 'stories'],
  ac: ['AC', 'ACs'],
}

/** "+1 feature, +1 story, +3 ACs, 1 AC changed, −1 AC" */
export function diffSummary(entries: ScopeDiffEntry[]): string {
  const parts: string[] = []
  const add = (kind: DiffKind, format: (n: number, noun: string) => string) => {
    for (const level of LEVELS) {
      const n = entries.filter((e) => e.kind === kind && e.level === level).length
      if (n > 0) parts.push(format(n, NOUN[level][n === 1 ? 0 : 1]))
    }
  }
  add('added', (n, noun) => `+${n} ${noun}`)
  add('changed', (n, noun) => `${n} ${noun} changed`)
  add('removed', (n, noun) => `−${n} ${noun}`)
  return parts.length > 0 ? parts.join(', ') : 'No changes'
}
