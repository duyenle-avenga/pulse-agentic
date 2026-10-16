import type { CiStatus, IsoDateTime, ProjectData, TestPlanMark, TestType } from '@/lib/domain/types'
import { evidenceCutoffs, isBeforeCutoff } from './evidenceCutoff'

/** `beforeChange`: recorded before the AC's text last changed, so it no longer counts (README §3.3). */
export type EvidenceItem = (
  | { kind: 'pr'; at: IsoDateTime; prNumber: number; mark: TestPlanMark; testType?: TestType; testFile?: string; ci: CiStatus; sha: string }
  | { kind: 'human'; at: IsoDateTime; result: 'pass' | 'fail'; environment: string; tester: string; notes?: string }
) & { beforeChange?: true }

/** Evidence per AC id (README §2): test plan items of merged PRs and human test results, newest first. */
export function evidenceByAc({ project, prs, humanTests }: ProjectData): Map<string, EvidenceItem[]> {
  const cutoffs = evidenceCutoffs(project)
  const byAc = new Map<string, EvidenceItem[]>()
  const add = (acId: string, item: EvidenceItem) => {
    const marked: EvidenceItem = isBeforeCutoff(cutoffs.get(acId), item.at) ? { ...item, beforeChange: true } : item
    byAc.set(acId, [...(byAc.get(acId) ?? []), marked])
  }

  for (const pr of prs) {
    if (pr.state !== 'merged' || !pr.mergedAt) continue
    for (const item of pr.testPlan) {
      if (!item.acId) continue
      add(item.acId, { kind: 'pr', at: pr.mergedAt, prNumber: pr.number, mark: item.mark, testType: item.testType, testFile: item.testFile, ci: pr.ci, sha: pr.headSha })
    }
  }
  for (const t of humanTests) {
    add(t.acId, { kind: 'human', at: t.testedAt, result: t.result, environment: t.environment, tester: t.tester, notes: t.notes })
  }
  for (const items of byAc.values()) items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return byAc
}
