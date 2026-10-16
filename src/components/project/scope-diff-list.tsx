import type { DiffKind, DiffLevel, ScopeDiffEntry } from '@/lib/progress/diffScopes'

const MARK: Record<DiffKind, { sign: string; label: string; className: string }> = {
  added: { sign: '+', label: 'Added', className: 'text-(--ac-verified)' },
  changed: { sign: '~', label: 'Changed', className: 'text-(--ac-implemented)' },
  removed: { sign: '−', label: 'Removed', className: 'text-(--ac-failing)' },
}

const LEVEL: Record<DiffLevel, string> = { feature: 'Feature', story: 'Story', ac: 'AC' }

/** A scope diff, used by Scope (compare), Approvals (impact) and Changelog. */
export function ScopeDiffList({ entries }: { entries: ScopeDiffEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No changes.</p>
  return (
    <ul className="space-y-1 text-sm">
      {entries.map((e) => {
        const mark = MARK[e.kind]
        return (
          <li key={`${e.kind}-${e.level}-${e.id}`} className="flex gap-2">
            <span aria-hidden className={`w-3 shrink-0 font-mono font-semibold ${mark.className}`}>
              {mark.sign}
            </span>
            <span>
              <span className="sr-only">{`${mark.label}: `}</span>
              <span className="font-medium">{`${LEVEL[e.level]} ${e.id}`}</span>{' '}
              {e.kind === 'changed' && e.before !== undefined ? (
                <>
                  <s className="text-muted-foreground">{e.before}</s>
                  {' → '}
                  {e.text}
                </>
              ) : (
                e.text
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
