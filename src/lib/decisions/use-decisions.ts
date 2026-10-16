'use client'

import { useSyncExternalStore } from 'react'
import { EMPTY_DECISIONS, type ProjectDecisions } from '@/lib/domain/planner'
import { createLocalStorageDecisionStore } from './local-storage-store'
import type { DecisionStore } from './store'

const store = createLocalStorageDecisionStore()

export function getDecisionStore(): DecisionStore {
  return store
}

/** Decisions for one project. The server snapshot is empty, so the first client render matches the server. */
export function useDecisions(projectId: string): ProjectDecisions {
  return useSyncExternalStore(
    store.subscribe,
    () => store.get(projectId),
    () => EMPTY_DECISIONS,
  )
}

const NO_DECISIONS: Readonly<Record<string, ProjectDecisions>> = Object.freeze({})

/** Every project's decisions. The server snapshot is empty, like useDecisions. */
export function useAllDecisions(): Readonly<Record<string, ProjectDecisions>> {
  return useSyncExternalStore(store.subscribe, store.getAll, () => NO_DECISIONS)
}

const noop = () => () => {}

/** False during server render and hydration, true afterwards. Use it to avoid a flash of the wrong state. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false)
}
