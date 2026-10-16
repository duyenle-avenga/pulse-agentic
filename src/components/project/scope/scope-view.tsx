'use client'

import { useState } from 'react'
import { HumanTestMark } from '@/components/human-test-mark'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currentScope } from '@/lib/domain/scope'
import type { AcState, ScopeVersion } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import { diffScopes } from '@/lib/progress/diffScopes'
import { AcStateBadge } from '../ac-state-badge'
import { useProject } from '../project-data-provider'
import { ScopeDiffList } from '../scope-diff-list'
import { ScreenHeading } from '../screen-heading'

const selectClass = 'h-8 rounded-lg border border-input bg-background px-2 text-sm dark:bg-input/30'

/** `from` / `to` come from the URL (`?from=v1&to=v1.1`), e.g. links from Approvals and Changelog. */
export function ScopeView({ from, to }: { from?: string; to?: string }) {
  const { data, acStates } = useProject()
  const versions = data.project.scopeVersions
  const labels = versions.map((v) => v.label)
  const current = currentScope(data.project).label

  // Choices stay null until the user picks, so versions created by decisions after hydration still match the URL.
  const [shownChoice, setShown] = useState<string | null>(null)
  const [baseChoice, setBase] = useState<string | null>(null)
  const shown = shownChoice ?? (to && labels.includes(to) ? to : current)
  const baseRaw = baseChoice ?? (from && labels.includes(from) ? from : '')
  const base = baseRaw === shown ? '' : baseRaw

  const version = versions.find((v) => v.label === shown) ?? currentScope(data.project)
  const baseVersion = versions.find((v) => v.label === base)
  const stateById = shown === current ? new Map(acStates.map((s) => [s.acId, s.state])) : null

  return (
    <div className="space-y-6">
      <ScreenHeading title="Scope" description="Features, user stories and acceptance criteria in each locked version." />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label htmlFor="scope-version" className="block text-sm font-medium">
            Version
          </label>
          <select id="scope-version" className={selectClass} value={shown} onChange={(e) => setShown(e.target.value)}>
            {labels.map((l) => (
              <option key={l} value={l}>
                {l === current ? `${l} (current)` : l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="scope-compare" className="block text-sm font-medium">
            Compare with
          </label>
          <select id="scope-compare" className={selectClass} value={base} onChange={(e) => setBase(e.target.value)}>
            <option value="">Nothing</option>
            {labels
              .filter((l) => l !== shown)
              .map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground">
          {`Locked ${formatDate(version.lockedAt)} by ${version.approvedBy}${version.changedBy ? ` · from ${version.changedBy}` : ''}`}
        </p>
      </div>

      {baseVersion && (
        <section aria-labelledby="scope-diff-heading" className="space-y-2 rounded-lg border p-4">
          <h3 id="scope-diff-heading" className="font-medium">{`Changes from ${base} to ${shown}`}</h3>
          <ScopeDiffList entries={diffScopes(baseVersion, version)} />
        </section>
      )}

      <ScopeTree version={version} stateById={stateById} />
    </div>
  )
}

function ScopeTree({ version, stateById }: { version: ScopeVersion; stateById: Map<string, AcState> | null }) {
  return (
    <div className="space-y-4">
      {version.features.map((f) => (
        <Card key={f.id}>
          <CardHeader>
            <CardTitle>
              <h3 className="m-0 text-base font-medium">{`${f.id} ${f.title}`}</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {f.stories.map((s) => {
              const verified = s.acs.filter((a) => stateById?.get(a.id) === 'verified').length
              return (
                <div key={s.id} className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm">
                      <span className="font-medium">{s.id}</span> {s.text}
                    </p>
                    {stateById && <span className="text-xs text-muted-foreground">{`${verified} of ${s.acs.length} verified`}</span>}
                  </div>
                  <ul className="space-y-1 border-l pl-4">
                    {s.acs.map((a) => {
                      const state = stateById?.get(a.id)
                      return (
                        <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                          <span>
                            <span className="font-medium">{a.id}</span> {a.text}
                            {a.humanTest && <HumanTestMark />}
                          </span>
                          {state && <AcStateBadge state={state} />}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
