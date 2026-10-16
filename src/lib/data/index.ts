import type { IsoDateTime } from '@/lib/domain/types'
import { ALL_PROJECTS } from '@/lib/mock'
import { DEMO_NOW } from '@/lib/mock/clock'
import { createMockRepository } from './mock-repository'
import type { PulseRepository } from './repository'

export type { PortfolioRow, ProjectHeaderData, ProjectOverview, PulseRepository } from './repository'

let repository: PulseRepository | undefined

export function getRepository(): PulseRepository {
  repository ??= createMockRepository(ALL_PROJECTS, DEMO_NOW)
  return repository
}

/** The time the data is "as of". Fixed in the POC so the demo is stable. */
export function getNow(): IsoDateTime {
  return DEMO_NOW
}
