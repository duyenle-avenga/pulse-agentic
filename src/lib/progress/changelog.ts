import type { IsoDateTime, ProjectData, ScopeChangeRequest } from '@/lib/domain/types'
import { diffScopes, type ScopeDiffEntry } from './diffScopes'

export type ChangelogEntry =
  | { kind: 'initial'; at: IsoDateTime; version: string; approvedBy: string }
  | { kind: 'version'; at: IsoDateTime; from: string; to: string; approvedBy: string; scr?: ScopeChangeRequest; diff: ScopeDiffEntry[] }
  | { kind: 'rejected'; at: IsoDateTime; scr: ScopeChangeRequest }

/** The append-only record of scope decisions (README §3.4), newest first. */
export function changelog({ project, scrs }: ProjectData): ChangelogEntry[] {
  const versions = project.scopeVersions
  const entries: ChangelogEntry[] = versions.map((v, i) =>
    i === 0
      ? { kind: 'initial', at: v.lockedAt, version: v.label, approvedBy: v.approvedBy }
      : {
          kind: 'version',
          at: v.lockedAt,
          from: versions[i - 1].label,
          to: v.label,
          approvedBy: v.approvedBy,
          scr: scrs.find((s) => s.id === v.changedBy),
          diff: diffScopes(versions[i - 1], v),
        },
  )
  for (const scr of scrs) {
    if (scr.status === 'rejected' && scr.decidedAt) entries.push({ kind: 'rejected', at: scr.decidedAt, scr })
  }
  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}
