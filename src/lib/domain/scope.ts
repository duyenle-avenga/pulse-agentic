import type { AcceptanceCriterion, Project, ScopeVersion } from './types'

export function currentScope(project: Project): ScopeVersion {
  const version = project.scopeVersions.at(-1)
  if (!version) throw new Error(`Project ${project.id} has no scope version`)
  return version
}

export function acsOf(version: ScopeVersion): AcceptanceCriterion[] {
  return version.features.flatMap((f) => f.stories.flatMap((s) => s.acs))
}
