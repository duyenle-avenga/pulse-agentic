import { acsOf } from '@/lib/domain/scope'
import type { AcState, IsoDateTime, Project } from '@/lib/domain/types'
import type { AcStatus } from './deriveAcStates'
import { DELIVERED_STATES } from './rollup'

export interface BurnupPoint {
  /** YYYY-MM-DD */
  date: string
  scope: number
  delivered: number
  verified: number
}

const DAY_MS = 86_400_000
// Days end at midnight Europe/Berlin summer time, matching the demo data.
const TZ_OFFSET = '+02:00'

export function stateAt(status: AcStatus, cutoffMs: number): AcState {
  let state: AcState = 'not_started'
  for (const t of status.history) {
    if (Date.parse(t.at) > cutoffMs) break
    state = t.state
  }
  return state
}

const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10)

export function burnup(project: Project, statuses: AcStatus[], now: IsoDateTime): BurnupPoint[] {
  const versions = project.scopeVersions
  if (versions.length === 0) return []
  const nowMs = Date.parse(now)
  const lastDay = now.slice(0, 10)

  const points: BurnupPoint[] = []
  for (let day = versions[0].lockedAt.slice(0, 10); day <= lastDay; day = nextDay(day)) {
    const cutoff = Math.min(Date.parse(`${day}T23:59:59${TZ_OFFSET}`), nowMs)
    const active = versions.filter((v) => Date.parse(v.lockedAt) <= cutoff).at(-1) ?? versions[0]
    const states = statuses.map((s) => stateAt(s, cutoff))
    points.push({
      date: day,
      scope: acsOf(active).length,
      delivered: states.filter((s) => DELIVERED_STATES.has(s)).length,
      verified: states.filter((s) => s === 'verified').length,
    })
  }
  return points
}
