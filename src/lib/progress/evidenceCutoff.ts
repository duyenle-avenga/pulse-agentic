import { acsOf } from '@/lib/domain/scope'
import type { IsoDateTime, Project } from '@/lib/domain/types'

/**
 * A changed AC needs new proof (README §3.3): for each AC whose text an approved scope version changed,
 * the `lockedAt` of the latest such version. Evidence from before it doesn't count for that AC.
 * ACs that were only added, or whose 👤 flag changed, have no cut-off.
 */
export function evidenceCutoffs(project: Project): Map<string, IsoDateTime> {
  const lastText = new Map<string, string>()
  const cutoffs = new Map<string, IsoDateTime>()
  for (const version of project.scopeVersions) {
    for (const ac of acsOf(version)) {
      const before = lastText.get(ac.id)
      if (before !== undefined && before !== ac.text) cutoffs.set(ac.id, version.lockedAt)
      lastText.set(ac.id, ac.text)
    }
  }
  return cutoffs
}

/** True when evidence at `at` predates the AC's last text change. */
export const isBeforeCutoff = (cutoff: IsoDateTime | undefined, at: IsoDateTime) => cutoff !== undefined && Date.parse(at) < Date.parse(cutoff)
