import type { Feature, ScopeProposal } from '@/lib/domain/types'

/** The features after an SCR's proposal is applied. Pure: the input is not changed. */
export function applyProposal(features: Feature[], proposal: ScopeProposal): Feature[] {
  const removed = new Set(proposal.removeAcIds)
  const changed = new Map(proposal.changeAcs.map((c) => [c.acId, c.text]))

  let next: Feature[] = features.map((f) => ({
    ...f,
    stories: f.stories.map((s) => ({
      ...s,
      acs: [
        ...s.acs.filter((a) => !removed.has(a.id)).map((a) => {
          const text = changed.get(a.id)
          return text === undefined ? a : { ...a, text }
        }),
        ...proposal.addAcs.filter((x) => x.storyId === s.id).map((x) => x.ac),
      ],
    })),
  }))

  for (const { featureId, featureTitle, story } of proposal.addStories) {
    next = next.some((f) => f.id === featureId)
      ? next.map((f) => (f.id === featureId ? { ...f, stories: [...f.stories, story] } : f))
      : [...next, { id: featureId, title: featureTitle ?? featureId, stories: [story] }]
  }
  return next
}

/** v1 → v1.1, v1.1 → v1.2. Approved scope changes are minor versions. */
export function nextVersionLabel(label: string): string {
  const match = /^v(\d+)(?:\.(\d+))?$/.exec(label)
  if (!match) throw new Error(`Unexpected scope version label "${label}"`)
  return `v${match[1]}.${Number(match[2] ?? 0) + 1}`
}
