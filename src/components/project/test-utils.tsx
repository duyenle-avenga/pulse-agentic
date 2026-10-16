import { render } from '@testing-library/react'
import type { ProjectData } from '@/lib/domain/types'
import { ProjectDataProvider } from './project-data-provider'

export const NOW = '2026-10-16T09:00:00+02:00'

/** Renders a screen inside the project provider, the way the project layout does. */
export function renderProject(ui: React.ReactElement, data: ProjectData) {
  return render(
    <ProjectDataProvider source={{ kind: 'project', data }} now={NOW}>
      {ui}
    </ProjectDataProvider>,
  )
}
